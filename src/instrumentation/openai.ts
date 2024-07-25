import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  Completion,
  ImagesResponse
} from 'openai/resources';
import { Stream } from 'openai/streaming';

import {
  ChatGeneration,
  CompletionGeneration,
  IGenerationMessage,
  LiteralClient,
  Maybe,
  StepConstructor
} from '..';

// Define a generic type for the original function to be wrapped
type OriginalFunction<T extends any[], R> = (...args: T) => Promise<R>;

// Utility function to wrap a method
function wrapFunction<T extends any[], R>(
  originalFunction: OriginalFunction<T, R>,
  client: LiteralClient,
  options: InstrumentOpenAIOptions = {}
): OriginalFunction<T, R> {
  return async function (this: any, ...args: T): Promise<R> {
    const start = Date.now();

    // Call the original function
    const result = await originalFunction.apply(this, args);

    if (result instanceof Stream) {
      const streamResult = result;
      const [returnedResult, processedResult] = streamResult.tee();

      await processOpenAIOutput(client, processedResult, {
        ...options,
        start,
        inputs: args[0]
      });

      return returnedResult as R;
    } else {
      await processOpenAIOutput(client, result as ChatCompletion | Completion, {
        ...options,
        start,
        inputs: args[0]
      });

      return result;
    }
  };
}

function instrumentOpenAI(
  client: LiteralClient,
  options: InstrumentOpenAIOptions = {}
) {
  // Patching the chat.completions.create function
  const originalChatCompletionsCreate =
    OpenAI.Chat.Completions.prototype.create;
  OpenAI.Chat.Completions.prototype.create = wrapFunction(
    originalChatCompletionsCreate,
    client,
    options
  ) as any;

  // Patching the completions.create function
  const originalCompletionsCreate = OpenAI.Completions.prototype.create;
  OpenAI.Completions.prototype.create = wrapFunction(
    originalCompletionsCreate,
    client,
    options
  ) as any;

  // Patching the images.generate function
  const originalImagesGenerate = OpenAI.Images.prototype.generate;
  OpenAI.Images.prototype.generate = wrapFunction(
    originalImagesGenerate,
    client,
    options
  ) as any;
}

function processChatDelta(
  newDelta: ChatCompletionChunk.Choice.Delta,
  messageCompletion: IGenerationMessage
): boolean {
  if (newDelta.function_call) {
    if (!messageCompletion.function_call) {
      messageCompletion.function_call = {};
    }

    if (newDelta.function_call.name) {
      messageCompletion.function_call.name = newDelta.function_call.name;
    }

    if (newDelta.function_call.arguments) {
      if (!messageCompletion.function_call.arguments) {
        messageCompletion.function_call.arguments = '';
      }
      messageCompletion.function_call.arguments +=
        newDelta.function_call.arguments;
    }
    return true;
  } else if (newDelta.tool_calls && newDelta.tool_calls.length > 0) {
    if (!messageCompletion.tool_calls) {
      messageCompletion.tool_calls = [];
    }

    const deltaToolCall = newDelta.tool_calls[0];
    if (deltaToolCall.function?.name) {
      messageCompletion.tool_calls.push({
        id: deltaToolCall.id,
        type: 'function',
        function: {
          name: deltaToolCall.function.name,
          arguments: ''
        }
      });
    }

    if (deltaToolCall.function?.arguments) {
      messageCompletion.tool_calls[deltaToolCall.index].function.arguments +=
        deltaToolCall.function.arguments;
    }

    return true;
  } else if (newDelta.content) {
    if (typeof messageCompletion.content === 'string') {
      messageCompletion.content += newDelta.content;
    } else {
      return false;
    }
    return true;
  }
  return false;
}

function jsonLoadArgs(message: IGenerationMessage) {
  if (message.function_call && message.function_call.arguments) {
    try {
      message.function_call.arguments = JSON.parse(
        message.function_call.arguments
      );
    } catch (error) {
      console.error('JSON parsing error in function_call arguments:', error);
    }
  }

  if (message.tool_calls) {
    message.tool_calls.forEach((tool_call) => {
      if (tool_call.function && tool_call.function.arguments) {
        try {
          tool_call.function.arguments = JSON.parse(
            tool_call.function.arguments
          );
        } catch (error) {
          console.error(
            'JSON parsing error in tool_call function arguments:',
            error
          );
        }
      }
    });
  }
}

function getSettings(inputs: Record<string, any>) {
  return {
    model: inputs.model,
    frequency_penalty: inputs.frequency_penalty,
    logit_bias: inputs.logit_bias,
    logprobs: inputs.logprobs,
    top_logprobs: inputs.top_logprobs,
    max_tokens: inputs.max_tokens,
    n: inputs.n,
    presence_penalty: inputs.presence_penalty,
    response_format: inputs.response_format,
    seed: inputs.seed,
    stop: inputs.stop,
    stream: inputs.stream,
    temperature: inputs.temperature,
    top_p: inputs.top_p,
    tool_choice: inputs.tool_choice
  };
}

async function processStreamResponse(
  stream: Stream<ChatCompletionChunk | Completion>,
  start: number
) {
  const messageCompletion: IGenerationMessage = {
    role: 'assistant',
    content: ''
  };
  let completion = '';

  let model;

  let isChat = true;

  let outputTokenCount = 0;
  let ttFirstToken: number | undefined = undefined;
  for await (const chunk of stream) {
    let ok = false;
    if (chunk.model) {
      model = chunk.model;
    }
    if (chunk.object === 'chat.completion.chunk') {
      isChat = true;
      ok = processChatDelta(chunk.choices[0].delta, messageCompletion);
    } else {
      isChat = false;
      if (chunk.choices[0]?.text) {
        completion += chunk.choices[0].text;
        ok = true;
      }
    }

    if (!ok) {
      // Handle the case where processing the delta fails
      continue;
    }
    if (!ttFirstToken) {
      ttFirstToken = Date.now() - start;
    }
    outputTokenCount += 1;
  }
  const duration = (Date.now() - start) / 1000;
  const tokenThroughputInSeconds =
    duration && outputTokenCount
      ? outputTokenCount / (duration / 1000)
      : undefined;

  jsonLoadArgs(messageCompletion);
  return {
    isChat,
    messageCompletion,
    completion,
    ttFirstToken,
    duration,
    outputTokenCount,
    model,
    tokenThroughputInSeconds
  };
}

function postprocessMessages(inputMessages: any[]) {
  let promptId: string | undefined;
  let variables: Record<string, any> | undefined;
  const messages = inputMessages.map((m: any) => {
    if (m.literalMetadata) {
      const metadata = m.literalMetadata();
      if (!promptId) {
        promptId = metadata.promptId;
      }
      if (!variables) {
        variables = metadata.variables;
      }
      m.uuid = metadata.uuid;
      m.templated = true;
    }
    return m;
  });

  return { promptId, variables, messages };
}

export type OpenAIOutput =
  | Completion
  | Stream<Completion>
  | ChatCompletion
  | Stream<ChatCompletion>
  | Stream<ChatCompletionChunk>
  | ImagesResponse;

export interface InstrumentOpenAIOptions {
  tags?: Maybe<string[]>;
}

export interface ProcessOpenAIOutput extends InstrumentOpenAIOptions {
  start: number;
  inputs: Record<string, any>;
}

function isStream(obj: any): boolean {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.pipe === 'function' &&
    typeof obj.on === 'function' &&
    typeof obj.read === 'function'
  );
}

const processOpenAIOutput = async (
  client: LiteralClient,
  output: OpenAIOutput,
  { start, tags, inputs }: ProcessOpenAIOutput
) => {
  const baseGeneration = {
    provider: 'openai',
    model: inputs.model,
    settings: getSettings(inputs),
    tags: tags
  };

  const threadFromStore = client._currentThread();
  const stepFromStore = client._currentStep();

  const parent = stepFromStore || threadFromStore;

  if ('data' in output) {
    // Image Generation
    const stepData: StepConstructor = {
      name: inputs.model || 'openai',
      type: 'llm',
      input: inputs,
      output: output,
      startTime: new Date(start).toISOString(),
      endTime: new Date().toISOString(),
      tags: tags
    };

    const step = parent
      ? parent.step(stepData)
      : client.step({ ...stepData, type: 'run' });
    await step.send();
  } else if (output instanceof Stream || isStream(output)) {
    const stream = output as Stream<ChatCompletionChunk | Completion>;

    if (!stream) {
      throw new Error('Stream not found');
    }

    const { isChat, completion, messageCompletion, model, ...metrics } =
      await processStreamResponse(stream, start);

    if (isChat) {
      const { promptId, messages, variables } = postprocessMessages(
        inputs.messages
      );

      const generation = new ChatGeneration({
        ...baseGeneration,
        messageCompletion,
        messages,
        variables,
        promptId,
        tools: inputs.tools,
        ...metrics
      });

      if (model) {
        generation.model = model;
      }

      if (parent) {
        const step = parent.step({
          name: generation.model || 'openai',
          type: 'llm',
          input: { content: inputs.messages },
          generation,
          output: messageCompletion,
          startTime: new Date(start).toISOString(),
          endTime: new Date(start + metrics.duration).toISOString()
        });
        await step.send();
      } else {
        await client.api.createGeneration(generation);
      }
    } else {
      const generation = new CompletionGeneration({
        ...baseGeneration,
        completion,
        prompt: inputs.prompt,
        ...metrics
      });

      if (model) {
        generation.model = model;
      }

      if (parent) {
        const step = parent.step({
          name: generation.model || 'openai',
          type: 'llm',
          input: { content: inputs.prompt },
          generation,
          output: { content: completion },
          startTime: new Date(start).toISOString(),
          endTime: new Date(start + metrics.duration).toISOString()
        });
        await step.send();
      } else {
        await client.api.createGeneration(generation);
      }
    }
  } else {
    if (output.model) {
      baseGeneration.model = output.model;
    }
    if (output.object === 'chat.completion') {
      const { promptId, messages, variables } = postprocessMessages(
        inputs.messages
      );

      const messageCompletion = output.choices[0].message as IGenerationMessage;
      jsonLoadArgs(messageCompletion);
      const generation = new ChatGeneration({
        ...baseGeneration,
        promptId,
        messageCompletion: messageCompletion,
        messages,
        variables,
        tools: inputs.tools,
        inputTokenCount: output.usage?.prompt_tokens,
        outputTokenCount: output.usage?.completion_tokens,
        tokenCount: output.usage?.total_tokens
      });

      if (parent) {
        const step = parent.step({
          name: generation.model || 'openai',
          type: 'llm',
          input: { content: inputs.messages },
          generation,
          output: messageCompletion,
          startTime: new Date(start).toISOString(),
          endTime: new Date().toISOString()
        });
        await step.send();
      } else {
        await client.api.createGeneration(generation);
      }
    } else {
      const completion = output.choices[0].text;
      const generation = new CompletionGeneration({
        ...baseGeneration,
        completion,
        prompt: inputs.prompt,
        inputTokenCount: output.usage?.prompt_tokens,
        outputTokenCount: output.usage?.completion_tokens,
        tokenCount: output.usage?.total_tokens
      });
      if (parent) {
        const step = parent.step({
          name: generation.model || 'openai',
          type: 'llm',
          input: { content: inputs.prompt },
          generation,
          output: { content: completion },
          startTime: new Date(start).toISOString(),
          endTime: new Date().toISOString()
        });
        await step.send();
      } else {
        await client.api.createGeneration(generation);
      }
    }
  }
};

export default instrumentOpenAI;
