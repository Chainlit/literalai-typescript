import type {
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart
} from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

import {
  ChatGeneration,
  Generation,
  IGenerationMessage,
  ILLMSettings,
  LiteralClient
} from '..';

export type VercelLanguageModel = LanguageModel;

const extractSettings = (options: LanguageModelV1CallOptions): ILLMSettings => {
  const { prompt, mode, abortSignal, ...settings } = options;
  return settings;
};

const extractMessages = (
  options: LanguageModelV1CallOptions
): IGenerationMessage[] => {
  return options.prompt as IGenerationMessage[];
};

const computeMetricsSync = (
  result: Awaited<ReturnType<LanguageModel['doGenerate']>>,
  startTime: number
): Partial<Generation> => {
  const outputTokenCount = result.usage.completionTokens;
  const inputTokenCount = result.usage.promptTokens;

  const duration = (Date.now() - startTime) / 1000;
  const tokenThroughputInSeconds =
    duration && outputTokenCount
      ? outputTokenCount / (duration / 1000)
      : undefined;

  return {
    duration,
    tokenThroughputInSeconds,
    outputTokenCount,
    inputTokenCount,
    messageCompletion: result.text
      ? { role: 'assistant', content: result.text }
      : undefined
  };
};

const computeMetricsStream = async (
  stream: ReadableStream<LanguageModelV1StreamPart>,
  startTime: number
): Promise<Partial<Generation>> => {
  const messageCompletion: IGenerationMessage = {
    role: 'assistant',
    content: ''
  };

  let outputTokenCount = 0;
  let ttFirstToken: number | undefined = undefined;
  for await (const chunk of stream as unknown as AsyncIterable<LanguageModelV1StreamPart>) {
    switch (chunk.type) {
      case 'text-delta': {
        messageCompletion.content += chunk.textDelta;
        break;
      }
      case 'tool-call':
      case 'tool-call-delta': {
        // TODO: Handle
        break;
      }
    }

    if (!ttFirstToken) {
      ttFirstToken = Date.now() - startTime;
    }
    outputTokenCount += 1;
  }

  const duration = (Date.now() - startTime) / 1000;
  const tokenThroughputInSeconds =
    duration && outputTokenCount
      ? outputTokenCount / (duration / 1000)
      : undefined;

  return {
    duration,
    tokenThroughputInSeconds,
    outputTokenCount,
    ttFirstToken,
    messageCompletion
  };
};

export const instrumentVercelSDKModel = <TModel extends LanguageModel>(
  client: LiteralClient,
  model: TModel
): TModel => {
  const baseGenerate = model.doGenerate;
  model.doGenerate = async (options) => {
    const startTime = Date.now();
    const result = await baseGenerate.call(model, options);

    const metrics = computeMetricsSync(result, startTime);

    const generation = new ChatGeneration({
      provider: model.provider,
      model: model.modelId,
      settings: extractSettings(options),
      messages: extractMessages(options),
      ...metrics
    });

    // Not awaited on purpose
    client.api.createGeneration(generation);

    return result;
  };

  const baseStream = model.doStream;
  model.doStream = async (options) => {
    const startTime = Date.now();
    const result = await baseStream.call(model, options);

    const [streamForAnalysis, streamForUser] = result.stream.tee();
    result.stream = streamForUser;

    // Not awaited on purpose
    computeMetricsStream(streamForAnalysis, startTime).then(async (metrics) => {
      const generation = new ChatGeneration({
        provider: model.provider,
        model: model.modelId,
        settings: extractSettings(options),
        messages: extractMessages(options),
        ...metrics
      });

      await client.api.createGeneration(generation);
    });

    return result;
  };

  return model;
};
