import { AsyncLocalStorage } from '@llamaindex/env';
import { type ChatMessage, Settings } from 'llamaindex';

import {
  ChatGeneration,
  type GenerationMessageRole,
  type IGenerationMessage,
  IImageUrlContent,
  ITextContent,
  LiteralClient,
  Thread
} from '..';

const convertMessage = (message: ChatMessage): IGenerationMessage => {
  return {
    role: message.role as GenerationMessageRole,
    content:
      typeof message.content === 'string'
        ? message.content
        : message.content.map((content): ITextContent | IImageUrlContent => {
            switch (content.type) {
              case 'text':
                return {
                  type: 'text',
                  text: content.text
                };
              case 'image_url':
                return {
                  type: 'image_url',
                  image_url: content.image_url.url
                };
            }
          })
  };
};

const threadAsyncLocalStorage = new AsyncLocalStorage<Thread>();

export const withThread = <R>(thread: Thread, callback: () => R) => {
  return threadAsyncLocalStorage.run(thread, callback);
};

export const instrumentLlamaIndex = (client: LiteralClient) => {
  const callbackManager = Settings.callbackManager;

  type LlmCall = {
    callId: string;
    startTime: number;
    inputMessages: IGenerationMessage[];
    ttft?: number;
    model?: string;
    tokenCount: number;
  };

  const currentLlmCalls = new Map<string, LlmCall>();

  callbackManager.on('llm-start', (event) => {
    const { id: callId, messages } = event.detail.payload;
    currentLlmCalls.set(callId, {
      callId,
      startTime: Date.now(),
      inputMessages: messages.map(convertMessage),
      tokenCount: 0
    });
  });

  callbackManager.on('llm-stream', (event) => {
    const { id: callId, chunk } = event.detail.payload;
    const call = currentLlmCalls.get(callId);
    if (!call) return;

    // FIXME: Typing is broken
    const raw = chunk.raw as any;

    if (!call.ttft) {
      call.ttft = Date.now() - call.startTime;
    }
    if (!call.model) {
      call.model = raw?.model;
    }

    call.tokenCount += 1;
  });

  callbackManager.on('llm-end', async (event) => {
    const { id: callId, response } = event.detail.payload;
    const call = currentLlmCalls.get(callId);
    if (!call) return;

    // FIXME: Typing is broken
    const raw = response.raw as any;

    const duration = (Date.now() - call.startTime) / 1000;
    const outputTokenCount: number =
      raw?.usage?.completion_tokens ?? call.tokenCount;
    const generation = new ChatGeneration({
      model: raw?.model ?? call.model,
      duration,
      messages: call.inputMessages,
      messageCompletion: convertMessage(response.message),
      inputTokenCount: raw?.usage?.prompt_tokens,
      outputTokenCount,
      tokenCount: raw?.usage?.total_tokens,
      tokenThroughputInSeconds: outputTokenCount / (duration / 1000),
      ttFirstToken: call.ttft
    });

    const parent = threadAsyncLocalStorage.getStore();

    if (parent) {
      const step = parent.step({
        name: generation.model || 'llm',
        type: 'llm',
        input: { content: generation.messages },
        generation,
        output: generation.messageCompletion,
        startTime: new Date(call.startTime).toISOString(),
        endTime: new Date(call.startTime + duration * 1000).toISOString()
      });
      await step.send();
    } else {
      await client.api.createGeneration(generation);
    }

    currentLlmCalls.delete(callId);
  });

  type RetrievalCall = {
    query: string;
    startTime: number;
  };

  const currentRetrievalCalls = new Map<string, RetrievalCall>();

  callbackManager.on('retrieve-start', (event) => {
    const query = JSON.stringify(event.detail.payload.query);
    currentRetrievalCalls.set(query, {
      query,
      startTime: Date.now()
    });
  });

  callbackManager.on('retrieve-end', async (event) => {
    const parent = threadAsyncLocalStorage.getStore();
    if (!parent) return;

    const query = JSON.stringify(event.detail.payload.query);
    const call = currentRetrievalCalls.get(query);

    const duration = call ? (Date.now() - call.startTime) / 1000 : undefined;

    const step = parent.step({
      name: 'retrieval',
      type: 'retrieval',
      input: { query: event.detail.payload.query },
      output: { nodes: event.detail.payload.nodes },
      startTime: call ? new Date(call.startTime).toISOString() : undefined,
      endTime: (call
        ? new Date(call.startTime + duration! * 1000)
        : new Date()
      ).toISOString()
    });
    await step.send();
  });
};
