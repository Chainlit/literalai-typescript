import { LiteralClient, Step, Thread } from '..';
import { LiteralCallbackHandler } from './langchain';
import instrumentOpenAI, {
  InstrumentOpenAIOptions,
  OpenAIOutput
} from './openai';
import { makeInstrumentVercelSDK } from './vercel-sdk';

export type { InstrumentOpenAIOptions } from './openai';

export default (client: LiteralClient) => ({
  openai: (
    output: OpenAIOutput,
    parent?: Step | Thread,
    options?: InstrumentOpenAIOptions
  ) => instrumentOpenAI(client, output, parent, options),
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
  }
});
