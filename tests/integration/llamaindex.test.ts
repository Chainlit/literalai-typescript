import 'dotenv/config';
import { CallbackManager, Settings, SimpleChatEngine } from 'llamaindex';

import { LiteralClient } from '../../src';

describe('Llama Index Instrumentation', () => {
  let client: LiteralClient;

  beforeAll(function () {
    const url = process.env.LITERAL_API_URL;
    const apiKey = process.env.LITERAL_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new LiteralClient(apiKey, url);

    // Reset the callback manager
    Settings.callbackManager = new CallbackManager();
  });

  // Skip for the CI
  describe.skip('with OpenAI', () => {
    it('should create generation when using SimpleChatEngine', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      client.instrumentation.llamaIndex.instrument();

      const engine = new SimpleChatEngine();
      const { response } = await engine.chat({
        message: 'Write a vegetarian lasagna recipe for 4 people.'
      });

      expect(response).toBeTruthy();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo-0125',
          messages: [
            {
              role: 'user',
              content: 'Write a vegetarian lasagna recipe for 4 people.'
            }
          ],
          messageCompletion: {
            role: 'assistant',
            content: response
          },
          duration: expect.any(Number)
        })
      );
    });

    it('should create generation when using SimpleChatEngine streamed', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      client.instrumentation.llamaIndex.instrument();

      const engine = new SimpleChatEngine();
      const stream = await engine.chat({
        message: 'Write a vegetarian tiramisu recipe for 6 people.',
        stream: true
      });

      let response = '';

      // use stream as an async iterable:
      for await (const chunk of stream) {
        response += chunk.response;
      }

      expect(response).toBeTruthy();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo-0125',
          messages: [
            {
              role: 'user',
              content: 'Write a vegetarian tiramisu recipe for 6 people.'
            }
          ],
          messageCompletion: {
            role: 'assistant',
            content: response
          },
          duration: expect.any(Number)
        })
      );
    });

    it('should work with a thread', async () => {
      const spy = jest.spyOn(client.api, 'sendSteps');

      client.instrumentation.llamaIndex.instrument();

      const thread = await client.thread({ name: 'LlamaIndex Test' }).upsert();

      const { response } = await client.instrumentation.llamaIndex.withThread(
        thread,
        async () => {
          const engine = new SimpleChatEngine();
          return engine.chat({
            message: 'Write a french toast recipe for 2 people.'
          });
        }
      );

      expect(response).toBeTruthy();

      // Sending message is done asynchronously
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(spy).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'llm',
          name: 'gpt-3.5-turbo-0125',
          threadId: thread.id,
          generation: expect.any(Object),
          input: {
            content: [
              {
                content: 'Write a french toast recipe for 2 people.',
                role: 'user'
              }
            ]
          },
          output: {
            role: 'assistant',
            content: response
          }
        })
      ]);
    });
  });
});
