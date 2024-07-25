import 'dotenv/config';
import OpenAI from 'openai';
import { PassThrough } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import {
  ChatGeneration,
  LiteralClient,
  Maybe,
  OmitUtils,
  Step
} from '../../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const openai = new OpenAI({ apiKey: 'an-ocean-of-noise' });

// Skip for the CI
describe('OpenAI Instrumentation', () => {
  // Mock OpenAI Calls
  beforeAll(() => {
    /* @ts-expect-error the mock is incomplete but that's OK */
    OpenAI.Chat.Completions.prototype.create = jest.fn(
      ({ stream }: { stream: boolean }) => {
        if (stream) {
          const generationId = uuidv4();
          const stream = new PassThrough({ objectMode: true });

          stream.write({
            id: generationId,
            object: 'chat.completion.chunk',
            choices: [
              {
                delta: { role: 'assistant', content: 'Ottawa' },
                index: 0,
                finish_reason: null
              }
            ]
          });

          stream.write({
            id: generationId,
            object: 'chat.completion.chunk',
            choices: [
              {
                delta: { role: 'assistant', content: ' is' },
                index: 0,
                finish_reason: null
              }
            ]
          });

          stream.end({
            id: generationId,
            object: 'chat.completion.chunk',
            choices: [
              {
                delta: { role: 'assistant', content: ' the capital of Canada' },
                index: 0,
                finish_reason: 'stop'
              }
            ]
          });

          return stream;
        }

        return Promise.resolve({
          id: uuidv4(),
          object: 'chat.completion',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Ottawa is the capital of Canada'
              }
            }
          ]
        });
      }
    );

    /* @ts-expect-error the mock is incomplete but that's OK */
    OpenAI.Images.prototype.generate = jest.fn(() => {
      return Promise.resolve({
        data: [{ url: 'https://example.com/image.png' }]
      });
    });
  });

  describe('Streamed chat generation', () => {
    let step: Maybe<Step>;
    let generationFromStep: OmitUtils<ChatGeneration>;

    beforeAll(async () => {
      const testId = uuidv4();

      const client = new LiteralClient(apiKey, url);
      client.instrumentation.openai({ tags: [testId] });

      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the capital of Canada?' }
        ],
        stream: true
      });

      const {
        data: [generation]
      } = await client.api.getGenerations({
        filters: [{ field: 'tags', operator: 'in', value: [testId] }]
      });

      step = await client.api.getStep(generation.id);
      generationFromStep = step!.generation!;
    });

    it('should create a generation with no thread or parent', async () => {
      expect(step?.threadId).toBeNull();
      expect(step?.parentId).toBeNull();
      expect(step?.type).toBe('llm');
    });

    it("should log a generation's input & output", async () => {
      expect(generationFromStep.messages).toEqual([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of Canada?' }
      ]);
      expect(generationFromStep.messageCompletion).toEqual({
        role: 'assistant',
        content: 'Ottawa is the capital of Canada'
      });
    });

    it("should log a generation's settings", async () => {
      expect(generationFromStep.provider).toBe('openai');
      expect(generationFromStep.model).toContain('gpt-3.5-turbo');
      expect(generationFromStep.tokenCount).toEqual(expect.any(Number));
      expect(generationFromStep.inputTokenCount).toEqual(expect.any(Number));
      expect(generationFromStep.outputTokenCount).toEqual(expect.any(Number));
    });
  });

  describe('Outside of a thread or step wrapper', () => {
    describe('Simple chat generation', () => {
      let step: Maybe<Step>;
      let generationFromStep: OmitUtils<ChatGeneration>;
      let response: OpenAI.ChatCompletion;

      beforeAll(async () => {
        const testId = uuidv4();

        const client = new LiteralClient(apiKey, url);

        client.instrumentation.openai({ tags: [testId] });

        response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is the capital of Canada?' }
          ]
        });

        const {
          data: [generation]
        } = await client.api.getGenerations({
          filters: [{ field: 'tags', operator: 'in', value: [testId] }]
        });

        step = await client.api.getStep(generation.id);
        generationFromStep = step!.generation!;
      });

      it('should create a generation with no thread or parent', async () => {
        expect(step?.threadId).toBeNull();
        expect(step?.parentId).toBeNull();
        expect(step?.type).toBe('llm');
      });

      it("should log a generation's input & output", async () => {
        expect(generationFromStep.messages).toEqual([
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the capital of Canada?' }
        ]);
        expect(generationFromStep.messageCompletion).toEqual({
          role: 'assistant',
          content: response.choices[0].message.content
        });
      });

      it("should log a generation's settings", async () => {
        expect(generationFromStep.provider).toBe('openai');
        expect(generationFromStep.model).toContain('gpt-3.5-turbo');
        expect(generationFromStep.tokenCount).toEqual(expect.any(Number));
        expect(generationFromStep.inputTokenCount).toEqual(expect.any(Number));
        expect(generationFromStep.outputTokenCount).toEqual(expect.any(Number));
      });
    });

    describe('Image generation', () => {
      it('should monitor image generation', async () => {
        const testId = uuidv4();

        const client = new LiteralClient(apiKey, url);
        client.instrumentation.openai({ tags: [testId] });

        const response = await openai.images.generate({
          prompt: 'A painting of a rose in the style of Picasso.',
          model: 'dall-e-2',
          size: '256x256',
          n: 1
        });

        const {
          data: [step]
        } = await client.api.getSteps({
          first: 1,
          filters: [{ field: 'tags', operator: 'in', value: [testId] }]
        });

        expect(step?.threadId).toBeNull();
        expect(step?.parentId).toBeNull();
        expect(step?.type).toBe('run');

        expect(step?.output?.data[0].url).toEqual(response.data[0].url);
      }, 30000);
    });
  });

  describe('Inside of a thread or step wrapper', () => {
    it('logs the generation inside its thread and parent', async () => {
      const client = new LiteralClient(apiKey, url);
      client.instrumentation.openai();

      let threadId: Maybe<string>;
      let parentId: Maybe<string>;

      await client.thread({ name: 'openai' }).wrap(async () => {
        threadId = client.getCurrentThread().id;
        return client.run({ name: 'openai' }).wrap(async () => {
          parentId = client.getCurrentStep().id;

          await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: 'What is the capital of Canada?' }
            ]
          });
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const {
        data: [step]
      } = await client.api.getSteps({
        first: 1,
        filters: [{ field: 'parentId', operator: 'eq', value: parentId! }]
      });

      expect(step?.threadId).toBe(threadId);
      expect(step?.parentId).toBe(parentId);
    }, 30_000);

    it("doesn't mix up threads and steps", async () => {
      const client = new LiteralClient(apiKey, url);
      client.instrumentation.openai();

      const firstThreadId = uuidv4();
      const secondThreadId = uuidv4();

      let firstStep: Maybe<Step>;
      let secondStep: Maybe<Step>;

      await Promise.all([
        client
          .thread({ id: firstThreadId, name: 'Thread 1' })
          .wrap(async () => {
            return client
              .step({ name: 'Step 1', type: 'assistant_message' })
              .wrap(async () => {
                firstStep = client.getCurrentStep();

                return openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'What is the capital of Canada?' }
                  ]
                });
              });
          }),
        client
          .thread({ id: secondThreadId, name: 'Thread 2' })
          .wrap(async () => {
            return client
              .step({ name: 'Step 2', type: 'assistant_message' })
              .wrap(async () => {
                secondStep = client.getCurrentStep();

                return openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'What is the capital of Canada?' }
                  ]
                });
              });
          })
      ]);

      const {
        data: [firstGeneration]
      } = await client.api.getSteps({
        first: 1,
        filters: [{ field: 'threadId', operator: 'eq', value: firstThreadId! }]
      });

      const {
        data: [secondGeneration]
      } = await client.api.getSteps({
        first: 1,
        filters: [{ field: 'threadId', operator: 'eq', value: secondThreadId! }]
      });

      expect(firstStep?.threadId).toEqual(firstThreadId);
      expect(secondStep?.threadId).toEqual(secondThreadId);

      expect(firstGeneration?.threadId).toEqual(firstThreadId);
      expect(firstGeneration?.parentId).toEqual(firstStep?.id);
      expect(secondGeneration?.threadId).toEqual(secondThreadId);
      expect(secondGeneration?.parentId).toEqual(secondStep?.id);
    }, 30_000);
  });

  describe('Handling tags and metadata', () => {
    it('handles tags and metadata on the instrumentation call', async () => {
      const client = new LiteralClient(apiKey, url);
      client.instrumentation.openai({
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' }
      });

      let parentId: Maybe<string>;

      await client.thread({ name: 'openai' }).wrap(async () => {
        return client.run({ name: 'openai' }).wrap(async () => {
          parentId = client.getCurrentStep().id;

          await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: 'What is the capital of Canada?' }
            ]
          });
        });
      });

      const {
        data: [step]
      } = await client.api.getSteps({
        first: 1,
        filters: [{ field: 'parentId', operator: 'eq', value: parentId! }]
      });

      expect(step!.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
      expect(step!.metadata).toEqual({ key: 'value' });
    });

    it('handles tags and metadata on the LLM call', async () => {
      const client = new LiteralClient(apiKey, url);

      const instrumentedOpenAi = client.instrumentation.openai({
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' }
      });

      let parentId: Maybe<string>;

      await client.thread({ name: 'openai' }).wrap(async () => {
        return client.run({ name: 'openai' }).wrap(async () => {
          parentId = client.getCurrentStep().id;

          await instrumentedOpenAi.chat.completions.create(
            {
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'What is the capital of Canada?' }
              ]
            },
            {
              literalaiTags: ['tag3', 'tag4'],
              literalaiMetadata: { otherKey: 'otherValue' }
            }
          );
        });
      });

      const {
        data: [step]
      } = await client.api.getSteps({
        first: 1,
        filters: [{ field: 'parentId', operator: 'eq', value: parentId! }]
      });

      expect(step!.tags).toEqual(
        expect.arrayContaining(['tag1', 'tag2', 'tag3', 'tag4'])
      );
      expect(step!.metadata!.key).toEqual('value');
      expect(step!.metadata!.otherKey).toEqual('otherValue');
    });
  });
});
