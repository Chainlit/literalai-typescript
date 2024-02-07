import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionChunk,
  Completion
} from 'openai/resources';
import { Stream } from 'openai/streaming';

import {
  ChatGeneration,
  CompletionGeneration,
  IGenerationMessage,
  Step
} from '..';

const openaiReqs: Record<
  string,
  {
    // Record the ID of the request
    id: string;
    // Record the start time of the request
    start: number;
    // Record the inputs of the request
    inputs: Record<string, any>;
    // Record the stream of the request if it's a streaming request
    stream?: Stream<ChatCompletionChunk | Completion>;
  }
> = {};

// Define a generic type for the original function to be wrapped
type OriginalFunction<T extends any[], R> = (...args: T) => Promise<R>;

// Utility function to wrap a method
function wrapFunction<T extends any[], R>(
  originalFunction: OriginalFunction<T, R>
): OriginalFunction<T, R> {
  return async function (this: any, ...args: T): Promise<R> {
    const start = Date.now();

    // Call the original function
    const result = await originalFunction.apply(this, args);

    if (result instanceof Stream) {
      const streamResult = result as Stream<ChatCompletionChunk | Completion>;
      // If it is a streaming request, we need to process the first token to get the id
      // However we also need to tee the stream so that the end developer can process the stream
      const [a, b] = streamResult.tee();
      // Re split the stream to store a clean instance for final processing later on
      const c = a.tee()[0];
      let id;
      // Iterate over the stream to find the first chunk and store the id
      for await (const chunk of a) {
        id = chunk.id;
        if (!openaiReqs[id]) {
          openaiReqs[id] = {
            id,
            inputs: args[0],
            start,
            stream: c
          };
          break;
        }
      }
      // @ts-expect-error Hacky way to add the id to the stream
      b.id = id;

      return b as any;
    } else {
      const regularResult = result as ChatCompletion | Completion;
      const id = regularResult.id;
      openaiReqs[id] = {
        id,
        inputs: args[0],
        start
      };
      return result;
    }
  };
}

// Patching the chat.completions.create function
const originalChatCompletionsCreate = OpenAI.Chat.Completions.prototype.create;
OpenAI.Chat.Completions.prototype.create = wrapFunction(
  originalChatCompletionsCreate
) as any;

// Patching the completions.create function
const originalCompletionsCreate = OpenAI.Completions.prototype.create;
OpenAI.Completions.prototype.create = wrapFunction(
  originalCompletionsCreate
) as any;

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

  let isChat = true;

  let tokenCount = 0;
  let ttFirstToken: number | undefined = undefined;
  for await (const chunk of stream) {
    let ok = false;
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
    tokenCount += 1;
  }
  const duration = Date.now() - start;
  const tokenThroughputInSeconds =
    duration && tokenCount ? tokenCount / (duration / 1000) : undefined;

  jsonLoadArgs(messageCompletion);
  return {
    isChat,
    messageCompletion,
    completion,
    ttFirstToken,
    duration,
    tokenThroughputInSeconds
  };
}

const instrumentOpenAI = async (
  step: Step,
  output:
    | Completion
    | Stream<Completion>
    | ChatCompletion
    | Stream<ChatCompletion>
    | Stream<ChatCompletionChunk>
) => {
  //@ts-expect-error - This is a hacky way to get the id from the stream
  const { stream, start, inputs } = openaiReqs[output.id];

  const baseGeneration = {
    provider: 'openai',
    model: inputs.model,

    settings: getSettings(inputs)
  };

  if (output instanceof Stream) {
    if (!stream) {
      throw new Error('Stream not found');
    }

    const { isChat, completion, messageCompletion, ...metrics } =
      await processStreamResponse(stream, start);

    if (isChat) {
      step.generation = new ChatGeneration({
        ...baseGeneration,
        messageCompletion,
        messages: inputs.messages,
        tools: inputs.tools,
        ...metrics
      });
      step.output = messageCompletion;
    } else {
      step.generation = new CompletionGeneration({
        ...baseGeneration,
        completion,
        prompt: inputs.prompt,
        ...metrics
      });
      step.output = completion;
    }
  } else {
    if (output.object === 'chat.completion') {
      step.generation = new ChatGeneration({
        ...baseGeneration,
        messageCompletion: output.choices[0].message as IGenerationMessage,
        messages: inputs.messages,
        tools: inputs.tools,
        inputTokenCount: output.usage?.prompt_tokens,
        outputTokenCount: output.usage?.completion_tokens,
        tokenCount: output.usage?.total_tokens
      });
      step.output = output.choices[0].message;
    } else {
      step.generation = new CompletionGeneration({
        ...baseGeneration,
        completion: output.choices[0].text,
        prompt: inputs.prompt,
        inputTokenCount: output.usage?.prompt_tokens,
        outputTokenCount: output.usage?.completion_tokens,
        tokenCount: output.usage?.total_tokens
      });
      step.output = output.choices[0].text;
    }
  }
};

export default instrumentOpenAI;
