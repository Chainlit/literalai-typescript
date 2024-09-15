import { LiteralClient, Maybe } from '..';
import { Thread } from '../observability/thread';
import type { AllVercelFn } from './vercel-sdk';

export type OpenAIGlobalOptions = {
  tags?: Maybe<string[]>;
  metadata?: Maybe<Record<string, any>>;
  client?: any;
};

export default (client: LiteralClient) => ({
  /**
   * Instrument the OpenAI client to log all generations to the Literal AI API.
   * Compatible with OpenAI's `chat.completions.create`, `completions.create` and `images.generate` functions.
   * If you want to add tags or metadata at the call level, you should use the augmented client returned by this function.
   * Its functions will be augmented with `literalaiTags` and `literalaiMetadata` options.
   * @param options
   * @param options.tags Tags to attach to all generations.
   * @param options.metadata Metadata to attach to all generations.
   * @returns
   */
  openai: (options?: OpenAIGlobalOptions) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { default: instrumentOpenAI } = require('./openai');
      return instrumentOpenAI(client, options);
    } catch (error) {
      throw new Error(
        'Failed to load OpenAI. Please ensure openai is installed.'
      );
    }
  },

  langchain: {
    literalCallback: (params?: {
      threadId?: string;
      chainTypesToIgnore?: string[];
    }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { LiteralCallbackHandler } = require('./langchain');
        return new LiteralCallbackHandler(
          client,
          params?.threadId,
          params?.chainTypesToIgnore
        );
      } catch (error) {
        throw new Error(
          'Failed to load langchain. Please ensure langchain is installed.'
        );
      }
    }
  },

  vercel: {
    instrument: <TFunction extends AllVercelFn>(fn: TFunction) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { makeInstrumentVercelSDK } = require('./vercel-sdk');
        return makeInstrumentVercelSDK(client)(fn);
      } catch (error) {
        throw new Error(
          'Failed to load Vercel SDK. Please ensure @vercel/ai is installed.'
        );
      }
    }
  },

  llamaIndex: {
    instrument: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { instrumentLlamaIndex } = require('./llamaindex');
        return instrumentLlamaIndex(client);
      } catch (error) {
        throw new Error(
          'Failed to load LlamaIndex. Please ensure llamaindex is installed.'
        );
      }
    },
    withThread: <R>(thread: Thread, callback: () => R) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { withThread } = require('./llamaindex');
        return withThread(thread, callback);
      } catch (error) {
        throw new Error(
          'Failed to load LlamaIndex. Please ensure llamaindex is installed.'
        );
      }
    }
  }
});
