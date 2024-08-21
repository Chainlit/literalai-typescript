import { LiteralClient, Maybe } from '..';
import { LiteralCallbackHandler } from './langchain';
import { instrumentLlamaIndex, withThread } from './llamaindex';
import instrumentOpenAI from './openai';
import { makeInstrumentVercelSDK } from './vercel-sdk';

export type OpenAIGlobalOptions = {
  tags?: Maybe<string[]>;
  metadata?: Maybe<Record<string, any>>;
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
  openai: (options?: OpenAIGlobalOptions) => instrumentOpenAI(client, options),

  langchain: {
    literalCallback: (params?: {
      threadId?: string;
      chainTypesToIgnore?: string[];
    }) => {
      try {
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
    /**
     * Instrument a Vercel SDK function to log all invocations to the Literal AI API.
     * It will be augmented with a `literalAiParent` option that allows you to specify a parent step or thread.
     * @param fn The function to instrument. This can be Vercel SDK's `generateText` or `streamText` functions.
     * @returns A new function that logs all invocations to the Literal AI API.
     */
    instrument: makeInstrumentVercelSDK(client)
  },

  llamaIndex: {
    /**
     * Instrument the LlamaIndex client to log all generations to the Literal AI API.
     */
    instrument: () => instrumentLlamaIndex(client),
    /**
     * Run a callback with a thread context.
     */
    withThread
  }
});
