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
  openai: (options?: OpenAIGlobalOptions) => instrumentOpenAI(client, options),
  langchain: {
    literalCallback: (threadId?: string) => {
      try {
        return new LiteralCallbackHandler(client, threadId);

        // Proceed with using `handler` as intended
      } catch (error) {
        throw new Error(
          'Failed to load the langchain. Please ensure langchain is installed.'
        );
      }
    }
  },
  vercel: {
    instrument: makeInstrumentVercelSDK(client)
  },
  llamaIndex: {
    instrument: () => instrumentLlamaIndex(client),
    withThread
  }
});
