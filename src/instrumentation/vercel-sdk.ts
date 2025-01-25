import {
  CoreTool,
  JSONValue,
  LanguageModel,
  ObjectStreamPart,
  TextStreamPart,
  generateObject as vGenerateObject,
  generateText as vGenerateText,
  streamObject as vStreamObject,
  streamText as vStreamText
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

type VercelExtraOptions = {
  literalaiTags?: Maybe<string[]>;
  literalaiMetadata?: Maybe<Record<string, any>>;
  literalaiStepId?: Maybe<string>;
};

export type VercelLanguageModel = LanguageModel;

type Options<T extends (...args: any[]) => any> = Parameters<T>[0];
type Result<T extends (...args: any[]) => any> = Awaited<ReturnType<T>>;

export type GenerateObject = typeof vGenerateObject;
export type GenerateText = typeof vGenerateText;
export type StreamObject = typeof vStreamObject;
export type StreamText = typeof vStreamText;

type GenerateObjectOptions = Parameters<typeof vGenerateObject>[0] &
  VercelExtraOptions;
type GenerateTextOptions = Parameters<typeof vGenerateText>[0] &
  VercelExtraOptions;
type StreamTextOptions = Parameters<typeof vStreamText>[0] & VercelExtraOptions;
type StreamObjectOptions = Parameters<typeof vStreamObject>[0] &
  VercelExtraOptions;

type OriginalStreamPart = string | ObjectStreamPart<any> | TextStreamPart<any>;

type GenerateFn = typeof vGenerateObject | typeof vGenerateText;
type StreamFn = typeof vStreamObject | typeof vStreamText;

export type AllVercelFn = GenerateFn | StreamFn;

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
          description: '',
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
      description: '',
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
  options: GenerateTextOptions,
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
        content: JSON.stringify(toolResult.result)
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
  stream:
    | ReadableStream<string>
    | ReadableStream<TextStreamPart<Record<string, CoreTool<any, any>>>>
    | ReadableStream<ObjectStreamPart<JSONValue>>,
  startTime: number
): Promise<Partial<Generation>> => {
  const messages = extractMessages(options);

  const textMessage: IGenerationMessage = {
    role: 'assistant',
    content: ''
  };

  let outputTokenCount = 0;
  let ttFirstToken: number | undefined = undefined;

  let accumulatedStreamObjectResponse: IGenerationMessage | undefined =
    undefined;

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
            content: JSON.stringify(chunk.result)
          });
          break;
        }
        case 'object': {
          const { object } = chunk as any;
          accumulatedStreamObjectResponse = {
            role: 'assistant',
            content: JSON.stringify(object)
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

  if (accumulatedStreamObjectResponse) {
    messages.push(accumulatedStreamObjectResponse);
  }

  const duration = (Date.now() - startTime) / 1000;
  const tokenThroughputInSeconds =
    duration && outputTokenCount
      ? outputTokenCount / (duration / 1000)
      : undefined;

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

export function streamText(client: LiteralClient) {
  return (options: StreamTextOptions) => {
    const startTime = Date.now();
    const parent = client._currentStep() || client._currentThread();
    const result = vStreamText(options);

    const [streamForAnalysis] = result.fullStream.tee();

    (async () => {
      const metrics = await computeMetricsStream(
        options,
        streamForAnalysis,
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
    })();

    return result;
  };
}

export function streamObject(client: LiteralClient) {
  return (options: StreamObjectOptions) => {
    const startTime = Date.now();
    const parent = client._currentStep() || client._currentThread();

    const origOnFinish = options.onFinish;

    // Can't make stream.tee() work (state error). Instead rely on onFinish.
    options.onFinish = async (e) => {
      origOnFinish?.(e);
      const metrics = computeMetricsSync(options, e as any, startTime);
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
    };

    return vStreamObject(options);
  };
}

export function generateText(client: LiteralClient) {
  return async (options: GenerateTextOptions) => {
    const startTime = Date.now();
    const parent = client._currentStep() || client._currentThread();
    const result = await vGenerateText(options);

    (async () => {
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
    })();

    return result;
  };
}

export function generateObject(client: LiteralClient) {
  return async (options: GenerateObjectOptions) => {
    const startTime = Date.now();
    const parent = client._currentStep() || client._currentThread();
    const result = await vGenerateObject(options);

    (async () => {
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
    })();

    return result;
  };
}
