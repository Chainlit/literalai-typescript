import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { z } from 'zod';

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

    it('should monitor tools', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const generateTextWithLiteralAI =
        client.instrumentation.vercel.instrument(generateText);

      const { text, toolResults } = await generateTextWithLiteralAI({
        model,
        system: 'You are a friendly assistant!',
        messages: [{ role: 'user', content: 'Convert 20°C to Fahrenheit' }],
        tools: {
          celsiusToFahrenheit: {
            description: 'Converts celsius to fahrenheit',
            parameters: z.object({
              value: z.number().describe('The value in celsius')
            }),
            execute: async ({ value }) => {
              const celsius = parseFloat(value);
              const fahrenheit = celsius * (9 / 5) + 32;
              return fahrenheit;
            }
          }
        }
      });

      expect(text).toBe('');
      expect(toolResults).toEqual([
        {
          toolCallId: expect.any(String),
          toolName: 'celsiusToFahrenheit',
          args: { value: 20 },
          result: 68
        }
      ]);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai.chat',
          model: 'gpt-3.5-turbo',
          tools: [
            {
              type: 'function',
              function: {
                name: 'celsiusToFahrenheit',
                description: 'Converts celsius to fahrenheit',
                parameters: {
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    value: {
                      type: 'number',
                      description: 'The value in celsius'
                    }
                  },
                  required: ['value']
                }
              }
            }
          ],
          messages: [
            { role: 'system', content: 'You are a friendly assistant!' },
            { role: 'user', content: 'Convert 20°C to Fahrenheit' },
            {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: toolResults[0].toolCallId,
                  type: 'function',
                  function: {
                    arguments: { value: 20 },
                    name: 'celsiusToFahrenheit'
                  }
                }
              ]
            }
          ],
          messageCompletion: {
            role: 'tool',
            tool_call_id: toolResults[0].toolCallId,
            content: String(toolResults[0].result)
          },
          duration: expect.any(Number)
        })
      );
    });

    it('should monitor tools in streams', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const streamTextWithLiteralAI =
        client.instrumentation.vercel.instrument(streamText);

      const result = await streamTextWithLiteralAI({
        model,
        system: 'You are a friendly assistant!',
        messages: [{ role: 'user', content: 'Convert 20°C to Fahrenheit' }],
        tools: {
          celsiusToFahrenheit: {
            description: 'Converts celsius to fahrenheit',
            parameters: z.object({
              value: z.number().describe('The value in celsius')
            }),
            execute: async ({ value }) => {
              const celsius = parseFloat(value);
              const fahrenheit = celsius * (9 / 5) + 32;
              return fahrenheit;
            }
          }
        }
      });

      // use textStream as an async iterable:
      const chunks = [];
      let toolCall, toolResult;
      for await (const chunk of result.fullStream) {
        chunks.push(chunk);
        if (chunk.type === 'tool-call') {
          toolCall = chunk;
        }
        if (chunk.type === 'tool-result') {
          toolResult = chunk;
        }
      }

      expect(toolCall!.toolCallId).toEqual(toolResult!.toolCallId);
      expect(toolResult).toEqual({
        type: 'tool-result',
        toolCallId: expect.any(String),
        toolName: 'celsiusToFahrenheit',
        args: { value: 20 },
        result: 68
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai.chat',
          model: 'gpt-3.5-turbo',
          tools: [
            {
              type: 'function',
              function: {
                name: 'celsiusToFahrenheit',
                description: 'Converts celsius to fahrenheit',
                parameters: {
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    value: {
                      type: 'number',
                      description: 'The value in celsius'
                    }
                  },
                  required: ['value']
                }
              }
            }
          ],
          messages: [
            { role: 'system', content: 'You are a friendly assistant!' },
            { role: 'user', content: 'Convert 20°C to Fahrenheit' },
            {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: toolResult!.toolCallId,
                  type: 'function',
                  function: {
                    arguments: { value: 20 },
                    name: 'celsiusToFahrenheit'
                  }
                }
              ]
            }
          ],
          messageCompletion: {
            role: 'tool',
            tool_call_id: toolResult!.toolCallId,
            content: String(toolResult!.result)
          },
          duration: expect.any(Number)
        })
      );
    });
  });
});
