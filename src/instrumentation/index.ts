import { LiteralClient, Step, Thread } from '..';
import instrumentOpenAI, { OpenAIOutput } from './openai';

export default (client: LiteralClient) => ({
  openai: (output: OpenAIOutput, parent?: Step | Thread) =>
    instrumentOpenAI(client, output, parent),
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
