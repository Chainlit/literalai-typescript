import { openai } from '@ai-sdk/openai';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { LiteralClient } from '../../src';
import { sleep } from '../utils';

const apiUrl = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!apiUrl || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient({ apiKey, apiUrl });

// Skip for the CI
describe.skip('Vercel SDK Instrumentation', () => {
  describe('With OpenAI', () => {
    afterEach(() => jest.restoreAllMocks());

    it('should work a simple text generation', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const generateTextWithLiteralAI =
        client.instrumentation.vercel.generateText;

      const result = await generateTextWithLiteralAI({
        model: openai('gpt-3.5-turbo'),
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

      const streamTextWithLiteralAI = client.instrumentation.vercel.streamText;

      const result = await streamTextWithLiteralAI({
        model: openai('gpt-3.5-turbo'),
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

    it('should work on structured generation', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const generateObjectWithLiteralAI =
        client.instrumentation.vercel.generateObject;

      const result = await generateObjectWithLiteralAI({
        model: openai('gpt-4'),
        schema: z.object({
          recipe: z.object({
            name: z.string(),
            ingredients: z.array(
              z.object({
                name: z.string(),
                amount: z.string()
              })
            ),
            steps: z.array(z.string())
          })
        }),
        prompt: 'Generate a carrot cake recipe.'
      });

      expect(result.object).toBeTruthy();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai.chat',
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Generate a carrot cake recipe.'
                }
              ]
            }
          ],
          messageCompletion: {
            role: 'assistant',
            content: JSON.stringify(result.object)
          },
          duration: expect.any(Number)
        })
      );
    });

    it('should work for streamed structured generation', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const streamObjectWithLiteralAI =
        client.instrumentation.vercel.streamObject;

      const result = await streamObjectWithLiteralAI({
        model: openai('gpt-4'),
        schema: z.object({
          recipe: z.object({
            name: z.string(),
            ingredients: z.array(
              z.object({
                name: z.string(),
                amount: z.string()
              })
            ),
            steps: z.array(z.string())
          })
        }),
        prompt: 'Generate a cheese cake recipe.'
      });

      let lastObject;
      // use partialObjectStream as an async iterable:
      for await (const part of result.partialObjectStream) {
        lastObject = part;
      }

      expect(lastObject).toBeTruthy();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai.chat',
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Generate a cheese cake recipe.'
                }
              ]
            }
          ],
          messageCompletion: {
            role: 'assistant',
            content: expect.any(String)
          },
          duration: expect.any(Number)
        })
      );
    });

    it('should observe on a given thread', async () => {
      const spy = jest.spyOn(client.api, 'sendSteps');

      await client.thread({ name: 'VercelSDK Test' }).wrap(async () => {
        const generateTextWithLiteralAI =
          client.instrumentation.vercel.generateText;

        const result = await generateTextWithLiteralAI({
          model: openai('gpt-3.5-turbo'),
          prompt: 'Write a vegetarian lasagna recipe for 4 people.'
        });

        expect(result.text).toBeTruthy();

        // Sending message is done asynchronously
        await sleep(1000);

        expect(spy).toHaveBeenCalledWith([
          expect.objectContaining({
            type: 'llm',
            name: 'gpt-3.5-turbo',
            threadId: client._currentThread()?.id,
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

    it('should monitor tools', async () => {
      const spy = jest.spyOn(client.api, 'createGeneration');

      const generateTextWithLiteralAI =
        client.instrumentation.vercel.generateText;

      const { text, toolResults } = await generateTextWithLiteralAI({
        model: openai('gpt-3.5-turbo'),
        system: 'You are a friendly assistant!',
        messages: [{ role: 'user', content: 'Convert 20°C to Fahrenheit' }],
        tools: {
          celsiusToFahrenheit: {
            description: 'Converts celsius to fahrenheit',
            parameters: z.object({
              value: z.number().describe('The value in celsius')
            }),
            execute: async ({ value }: any) => {
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

      const streamTextWithLiteralAI = client.instrumentation.vercel.streamText;

      const result = await streamTextWithLiteralAI({
        model: openai('gpt-3.5-turbo'),
        system: 'You are a friendly assistant!',
        messages: [{ role: 'user', content: 'Convert 20°C to Fahrenheit' }],
        tools: {
          celsiusToFahrenheit: {
            description: 'Converts celsius to fahrenheit',
            parameters: z.object({
              value: z.number().describe('The value in celsius')
            }),
            execute: async ({ value }: any) => {
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

  describe('Literal AI metadata', () => {
    const generateTextWithLiteralAI =
      client.instrumentation.vercel.generateText;

    it('should create a generation with the provided ID', async () => {
      const literalaiStepId = uuidv4();

      await generateTextWithLiteralAI({
        model: openai('gpt-3.5-turbo'),
        prompt: 'Write a vegetarian lasagna recipe for 4 people.',
        // @ts-expect-error could not add literal ai fields in type def
        literalaiStepId
      });

      await sleep(1000);

      const step = await client.api.getStep(literalaiStepId);

      expect(step!.id).toEqual(literalaiStepId);
      expect(step!.type).toEqual('llm');
    });

    it('should create a generation with the provided tags and metadata', async () => {
      const literalaiStepId = uuidv4();

      await generateTextWithLiteralAI({
        model: openai('gpt-3.5-turbo'),
        prompt: 'Write a vegetarian lasagna recipe for 4 people.',
        // @ts-expect-error could not add literal ai fields in type def
        literalaiStepId,
        literalaiTags: ['tag1', 'tag2'],
        literalaiMetadata: { otherKey: 'otherValue' }
      });

      await sleep(1000);

      const step = await client.api.getStep(literalaiStepId);

      expect(step!.metadata).toEqual(
        expect.objectContaining({ otherKey: 'otherValue' })
      );
      expect(step!.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
    });
  });
});
