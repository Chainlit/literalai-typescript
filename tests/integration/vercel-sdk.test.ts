import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

import { LiteralClient } from '../../src';

describe('Vercel SDK Instrumentation', () => {
  let client: LiteralClient;

  beforeAll(function () {
    const url = process.env.LITERAL_API_URL;
    const apiKey = process.env.LITERAL_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new LiteralClient(apiKey, url);
  });

  // Skip for the CI
  describe.skip('With OpenAI', () => {
    let model: ReturnType<typeof openai>;
    beforeEach(() => {
      model = openai('gpt-3.5-turbo');
    });

    afterEach(() => jest.restoreAllMocks());

    it('should work a simple generation', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const generateTextWithLiteralAI =
        client.instrumentation.vercel.instrument(generateText);

      const result = await generateTextWithLiteralAI({
        model,
        prompt: 'Write a vegetarian lasagna recipe for 4 people.'
      });

      expect(result.text).toBeTruthy();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai.chat',
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Write a vegetarian lasagna recipe for 4 people.'
                }
              ]
            }
          ],
          messageCompletion: { role: 'assistant', content: result.text },
          duration: expect.any(Number)
        })
      );
    });

    it('should work for streamed text', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const streamTextWithLiteralAI =
        client.instrumentation.vercel.instrument(streamText);

      const result = await streamTextWithLiteralAI({
        model,
        prompt: 'Write a strawberry tiramisu recipe for 4 people.'
      });

      let resultText = '';
      // use textStream as an async iterable:
      for await (const textPart of result.textStream) {
        resultText += textPart;
      }

      expect(resultText).toBeTruthy();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai.chat',
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Write a strawberry tiramisu recipe for 4 people.'
                }
              ]
            }
          ],
          messageCompletion: { role: 'assistant', content: resultText },
          duration: expect.any(Number)
        })
      );
    });

    it('should observe on a given thread', async () => {
      const spy = jest.spyOn(client.api, 'sendSteps');

      const thread = await client.thread({ name: 'VercelSDK Test' }).upsert();

      const generateTextWithLiteralAI =
        client.instrumentation.vercel.instrument(generateText);

      const result = await generateTextWithLiteralAI({
        model,
        prompt: 'Write a vegetarian lasagna recipe for 4 people.',
        literalAiParent: thread
      });

      expect(result.text).toBeTruthy();

      // Sending message is done asynchronously
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(spy).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'llm',
          name: 'gpt-3.5-turbo',
          threadId: thread.id,
          generation: expect.any(Object),
          input: {
            content: [
              {
                role: 'user',
                content: [
                  {
                    text: 'Write a vegetarian lasagna recipe for 4 people.',
                    type: 'text'
                  }
                ]
              }
            ]
          },
          output: { role: 'assistant', content: result.text }
        })
      ]);
    });
  });
});
