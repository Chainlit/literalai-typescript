import type {
  CoreTool,
  LanguageModel,
  ObjectStreamPartInput,
  TextStreamPart,
  generateObject,
  generateText,
  streamObject,
  streamText
} from 'ai';

import {
  ChatGeneration,
  Generation,
  IGenerationMessage,
  ILLMSettings,
  LiteralClient,
  Step,
  Thread
} from '..';

export type VercelLanguageModel = LanguageModel;

type Options<T extends (...args: any[]) => any> = Parameters<T>[0];
type Result<T extends (...args: any[]) => any> = Awaited<ReturnType<T>>;

type GenerateFn = typeof generateObject | typeof generateText;
type StreamFn = typeof streamObject | typeof streamText;
type AllVercelFn = GenerateFn | StreamFn;

type OriginalStreamPart = string | ObjectStreamPartInput | TextStreamPart<any>;

const extractMessages = (
  options: Options<AllVercelFn>
): IGenerationMessage[] => {
  const messages: IGenerationMessage[] = [];

  if (options.system) {
    messages.push({
      role: 'system',
      content: options.system
    });
  }

  if (options.prompt) {
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: options.prompt }]
    });
  }

  if (options.messages) {
    messages.push(...(options.messages as any));
  }

  return messages;
};

const extractSettings = (options: Options<AllVercelFn>): ILLMSettings => {
  const settings = { ...options } as any;
  delete settings.model;
  delete settings.prompt;
  delete settings.abortSignal;
  return settings;
};

const computeMetricsSync = (
  result: Result<GenerateFn>,
  startTime: number
): Partial<Generation> => {
  const outputTokenCount = result.usage.completionTokens;
  const inputTokenCount = result.usage.promptTokens;

  const duration = (Date.now() - startTime) / 1000;
  const tokenThroughputInSeconds =
    duration && outputTokenCount
      ? outputTokenCount / (duration / 1000)
      : undefined;

  const completion =
    'text' in result ? result.text : JSON.stringify(result.object);

  return {
    duration,
    tokenThroughputInSeconds,
    outputTokenCount,
    inputTokenCount,
    messageCompletion: { role: 'assistant', content: completion }
  };
};

const computeMetricsStream = async (
  stream: ReadableStream<OriginalStreamPart>,
  startTime: number
): Promise<Partial<Generation>> => {
  const messageCompletion: IGenerationMessage = {
    role: 'assistant',
    content: ''
  };

  let outputTokenCount = 0;
  let ttFirstToken: number | undefined = undefined;
  for await (const chunk of stream as unknown as AsyncIterable<OriginalStreamPart>) {
    if (typeof chunk === 'string') {
      messageCompletion.content += chunk;
    } else {
      switch (chunk.type) {
        case 'text-delta': {
          messageCompletion.content += chunk.textDelta;
          break;
        }
        case 'tool-call':
        case 'tool-result': {
          // TODO: Handle
          break;
        }
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

type ExtendedFunction<T extends (...args: any[]) => any> = (
  options: Parameters<T>[0] & {
    literalAiParent?: Step | Thread;
  }
) => ReturnType<T>;

export const makeInstrumentVercelSDK = (client: LiteralClient) => {
  function instrumentVercelSDK<T>(
    fn: typeof streamObject<T>
  ): ExtendedFunction<typeof streamObject<T>>;
  function instrumentVercelSDK<
    TOOLS extends Record<string, CoreTool<any, any>>
  >(fn: typeof streamText<TOOLS>): ExtendedFunction<typeof streamText<TOOLS>>;
  function instrumentVercelSDK<T>(
    fn: typeof generateObject<T>
  ): ExtendedFunction<typeof generateObject<T>>;
  function instrumentVercelSDK<
    TOOLS extends Record<string, CoreTool<any, any>>
  >(
    fn: typeof generateText<TOOLS>
  ): ExtendedFunction<typeof generateText<TOOLS>>;
  function instrumentVercelSDK<TFunction extends AllVercelFn>(fn: TFunction) {
    type TOptions = Options<TFunction>;
    type TResult = Result<TFunction>;

    return async (
      options: TOptions & { literalAiParent?: Step | Thread }
    ): Promise<TResult> => {
      const { literalAiParent: parent, ...originalOptions } = options;
      const startTime = Date.now();
      const result: TResult = await (fn as any)(originalOptions);

      // Fork the stream to compute metrics
      let stream: ReadableStream<OriginalStreamPart>;
      if ('originalStream' in result) {
        const [streamForAnalysis, streamForUser] = (
          result as any
        ).originalStream.tee();
        (result as any).originalStream = streamForUser;
        stream = streamForAnalysis;
      }

      // Non blocking treatments
      (async () => {
        if ('fullStream' in result) {
          // streamObject or streamText
          const metrics = await computeMetricsStream(stream!, startTime);

          const generation = new ChatGeneration({
            provider: options.model.provider,
            model: options.model.modelId,
            settings: extractSettings(options),
            messages: extractMessages(options),
            ...metrics
          });

          if (parent) {
            const step = parent.step({
              name: generation.model || 'openai',
              type: 'llm',
              input: { content: generation.messages },
              generation,
              output: generation.messageCompletion,
              startTime: new Date(startTime).toISOString(),
              endTime: new Date(
                startTime + (metrics.duration ?? 0) * 1000
              ).toISOString()
            });
            await step.send();
          } else {
            await client.api.createGeneration(generation);
          }
        } else {
          // generateObject or generateText
          const metrics = computeMetricsSync(result, startTime);

          const generation = new ChatGeneration({
            provider: options.model.provider,
            model: options.model.modelId,
            settings: extractSettings(options),
            messages: extractMessages(options),
            ...metrics
          });

          if (parent) {
            const step = parent.step({
              name: generation.model || 'openai',
              type: 'llm',
              input: { content: generation.messages },
              generation,
              output: generation.messageCompletion,
              startTime: new Date(startTime).toISOString(),
              endTime: new Date(
                startTime + (metrics.duration ?? 0) * 1000
              ).toISOString()
            });
            await step.send();
          } else {
            await client.api.createGeneration(generation);
          }
        }
      })();

      return result;
    };
  }

  return instrumentVercelSDK;
};
