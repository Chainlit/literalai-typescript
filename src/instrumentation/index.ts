import { LiteralClient } from '..';
import instrumentOpenAI from './openai';

export default (client: LiteralClient) => ({
  openai: instrumentOpenAI,
  langchain: {
    literalCallback: (threadId?: string) => {
      try {
        // Import the module that requires `langchain`
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { LiteralCallbackHandler } = require('./langchain');

        return new LiteralCallbackHandler(client, threadId);

        // Proceed with using `handler` as intended
      } catch (error) {
        throw new Error(
          'Failed to load the langchain. Please ensure langchain is installed.'
        );
      }
    }
  }
});
