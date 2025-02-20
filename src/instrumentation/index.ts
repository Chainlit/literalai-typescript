import { LiteralClient, Maybe } from '..';
import { Thread } from '../observability/thread';
import type {
  GenerateObject,
  GenerateText,
  StreamObject,
  StreamText
} from './vercel-sdk';

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
  get openai() {
    return (options?: OpenAIGlobalOptions) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: instrumentOpenAI } = require('./openai');
        return instrumentOpenAI(client, options);
      } catch (error) {
        throw new Error(
          'Failed to load OpenAI. Please ensure openai is installed.'
        );
      }
    };
  },

  get langchain() {
    return {
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
    };
  },

  get vercel() {
    try {
      const {
        streamText,
        generateText,
        streamObject,
        generateObject
        // eslint-disable-next-line @typescript-eslint/no-var-requires
      } = require('./vercel-sdk');
      return {
        streamText: streamText(client) as StreamText,
        generateText: generateText(client) as GenerateText,
        streamObject: streamObject(client) as StreamObject,
        generateObject: generateObject(client) as GenerateObject
      };
    } catch (error) {
      throw new Error(
        'Failed to load Vercel SDK. Please ensure @vercel/ai is installed: ' +
          String(error)
      );
    }
  },

  llamaIndex: {
    get instrument() {
      return () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { instrumentLlamaIndex } = require('./llamaindex');
          return instrumentLlamaIndex(client);
        } catch (error) {
          throw new Error(
            'Failed to load LlamaIndex. Please ensure llamaindex is installed.'
          );
        }
      };
    },
    get withThread() {
      return <R>(thread: Thread, callback: () => R) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { withThread } = require('./llamaindex');
          return withThread(thread, callback);
        } catch (error) {
          throw new Error(
            'Failed to load LlamaIndex. Please ensure llamaindex is installed.'
          );
        }
      };
    }
  }
});
