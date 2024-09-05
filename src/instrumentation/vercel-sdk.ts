import type {
  CoreTool,
  LanguageModel,
  ObjectStreamPart,
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
  ITool,
  LiteralClient,
  Maybe
} from '..';

export type VercelLanguageModel = LanguageModel;

type Options<T extends (...args: any[]) => any> = Parameters<T>[0];
type Result<T extends (...args: any[]) => any> = Awaited<ReturnType<T>>;

type GenerateFn = typeof generateObject | typeof generateText;
type StreamFn = typeof streamObject | typeof streamText;
type AllVercelFn = GenerateFn | StreamFn;

type OriginalStreamPart = string | ObjectStreamPart<any> | TextStreamPart<any>;

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
  delete settings.messages;
  delete settings.prompt;
  delete settings.abortSignal;
  if ('tools' in settings) {
    settings.tools = Object.fromEntries(
      Object.entries<CoreTool>(settings.tools).map(([key, tool]) => [
        key,
        {
          description: tool.description,
          parameters: tool.parameters
        }
      ])
    );
  }

  return settings;
};

const extractTools = (options: Options<AllVercelFn>): ITool[] | undefined => {
  if (!('tools' in options) || !options.tools) return undefined;
  return Object.entries(options.tools).map(([key, tool]) => ({
    type: 'function',
    function: {
      name: key,
      description: tool.description!,
      parameters: tool.parameters
    }
  }));
};

const extractPrompt = (
  options: Options<AllVercelFn>
):
  | { uuid: string; promptId: string; variables: Record<string, any> }
  | undefined => {
  if (!options.messages) return undefined;

  for (const message of options.messages) {
    if (typeof (message as any).literalMetadata === 'function') {
      return (message as any).literalMetadata();
    }
  }

  return undefined;
};

const computeMetricsSync = (
  options: Options<GenerateFn>,
  result: Result<GenerateFn>,
  startTime: number
): Partial<ChatGeneration> => {
  const outputTokenCount = result.usage.completionTokens;
  const inputTokenCount = result.usage.promptTokens;

  const duration = (Date.now() - startTime) / 1000;
  const tokenThroughputInSeconds =
    duration && outputTokenCount
      ? outputTokenCount / (duration / 1000)
      : undefined;

  const completion =
    'text' in result ? result.text : JSON.stringify(result.object);

  const messages = extractMessages(options);

  if (completion) {
    messages.push({
      role: 'assistant',
      content: completion
    });
  }
  if ('toolCalls' in result && result.toolCalls.length) {
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: result.toolCalls.map((call) => ({
        id: call.toolCallId,
        type: 'function',
        function: {
          name: call.toolName,
          arguments: call.args
        }
      }))
    });
    for (const toolResult of result.toolResults as any[]) {
      messages.push({
        role: 'tool',
        tool_call_id: toolResult.toolCallId,
        content: String(toolResult.result)
      });
    }
  }

  const messageCompletion = messages.pop();

  const promptData = extractPrompt(options);
  const promptId = promptData?.promptId;
  const variables = promptData?.variables;
  if (messages.length > 0) {
    messages[0].uuid = promptData?.uuid;
  }

  return {
    promptId,
    variables,
    duration,
    tokenThroughputInSeconds,
    outputTokenCount,
    inputTokenCount,
    messages,
    messageCompletion
  };
};

const computeMetricsStream = async (
  options: Options<StreamFn>,
  stream: ReadableStream<OriginalStreamPart>,
  startTime: number
): Promise<Partial<Generation>> => {
  const messages = extractMessages(options);

  const textMessage: IGenerationMessage = {
    role: 'assistant',
    content: ''
  };

  let outputTokenCount = 0;
  let ttFirstToken: number | undefined = undefined;
  for await (const chunk of stream as unknown as AsyncIterable<OriginalStreamPart>) {
    if (typeof chunk === 'string') {
      textMessage.content += chunk;
    } else {
      switch (chunk.type) {
        case 'text-delta': {
          textMessage.content += chunk.textDelta;
          break;
        }
        case 'tool-call': {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: chunk.toolCallId,
                type: 'function',
                function: {
                  name: chunk.toolName,
                  arguments: chunk.args
                }
              }
            ]
          });
          break;
        }
        case 'tool-result': {
          messages.push({
            role: 'tool',
            tool_call_id: chunk.toolCallId,
            content: String(chunk.result)
          });
          break;
        }
        case 'object': {
          console.log({ chunk });
          const { object } = chunk as ObjectStreamPart<any>;
          messages[messages.length - 1] = {
            role: 'assistant',
            content: JSON.stringify({})
          };
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

  console.log(messages, textMessage);

  if (textMessage.content) messages.push(textMessage);
  const messageCompletion = messages.pop();

  const promptData = extractPrompt(options);
  const promptId = promptData?.promptId;
  const variables = promptData?.variables;
  if (messages.length > 0) {
    messages[0].uuid = promptData?.uuid;
  }

  return {
    promptId,
    variables,
    duration,
    tokenThroughputInSeconds,
    outputTokenCount,
    ttFirstToken,
    messages,
    messageCompletion
  };
};

type VercelExtraOptions = {
  literalaiTags?: Maybe<string[]>;
  literalaiMetadata?: Maybe<Record<string, any>>;
  literalaiStepId?: Maybe<string>;
};

export type InstrumentationVercelMethod = {
  (fn: typeof streamObject): <T>(
    options: Parameters<typeof streamObject<T>>[0] & VercelExtraOptions
  ) => ReturnType<typeof streamObject<T>>;

  (fn: typeof streamText): <TOOLS extends Record<string, CoreTool<any, any>>>(
    options: Parameters<typeof streamText<TOOLS>>[0] & VercelExtraOptions
  ) => ReturnType<typeof streamText<TOOLS>>;

  (fn: typeof generateObject): <T>(
    options: Parameters<typeof generateObject<T>>[0] & VercelExtraOptions
  ) => ReturnType<typeof generateObject<T>>;

  (fn: typeof generateText): <TOOLS extends Record<string, CoreTool<any, any>>>(
    options: Parameters<typeof generateText<TOOLS>>[0] & VercelExtraOptions
  ) => ReturnType<typeof generateText<TOOLS>>;
};

export const makeInstrumentVercelSDK = (
  client: LiteralClient
): InstrumentationVercelMethod => {
  function instrumentVercelSDK<TFunction extends AllVercelFn>(fn: TFunction) {
    type TOptions = Options<TFunction>;
    type TResult = Result<TFunction>;

    return async (options: TOptions & VercelExtraOptions): Promise<TResult> => {
      const startTime = Date.now();
      const result: TResult = await (fn as any)(options);

      const threadFromStore = client._currentThread();
      const stepFromStore = client._currentStep();

      const parent = stepFromStore || threadFromStore;

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
          const metrics = await computeMetricsStream(
            options,
            stream!,
            startTime
          );

          const generation = new ChatGeneration({
            ...(options.literalaiStepId && { id: options.literalaiStepId }),
            metadata: options.literalaiMetadata,
            tags: options.literalaiTags,
            provider: options.model.provider,
            model: options.model.modelId,
            settings: extractSettings(options),
            tools: extractTools(options),
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
          const metrics = computeMetricsSync(options, result, startTime);

          const generation = new ChatGeneration({
            ...(options.literalaiStepId && { id: options.literalaiStepId }),
            metadata: options.literalaiMetadata,
            tags: options.literalaiTags,
            provider: options.model.provider,
            model: options.model.modelId,
            settings: extractSettings(options),
            tools: extractTools(options),
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
