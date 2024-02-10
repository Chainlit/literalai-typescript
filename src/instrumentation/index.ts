import { LiteralClient } from '..';
import instrumentOpenAI from './openai';

export default (client: LiteralClient) => ({
  openai: instrumentOpenAI,
  langchain: {
    literalCallback: async (threadId?: string) => {
      try {
        // Dynamically import the module that requires `langchain`
        const { LiteralCallbackHandler } = await import('./langchain');

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
