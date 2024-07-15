import { LiteralClient } from '..';
import { LiteralCallbackHandler } from './langchain';
import { instrumentLlamaIndex, withThread } from './llamaindex';
import instrumentOpenAI from './openai';
import { InstrumentOpenAIOptions } from './openai';
import { makeInstrumentVercelSDK } from './vercel-sdk';

export type { InstrumentOpenAIOptions } from './openai';

export default (client: LiteralClient) => ({
  openai: (options?: InstrumentOpenAIOptions) =>
    instrumentOpenAI(client, options),
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
