import { openai } from '@ai-sdk/openai';
import { ChatOpenAI } from '@langchain/openai';
import { generateText } from 'ai';
import 'dotenv/config';
import { SimpleChatEngine } from 'llamaindex';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

import { LiteralClient, Maybe } from '../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient({ apiKey, apiUrl: url });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Decorator', () => {
  describe('Manual logging', () => {
    it('adds metadata and tags to everything logged inside the wrapper', async () => {
      let threadId: Maybe<string>;
      let stepId: Maybe<string>;
      const metadata = { key: 'value' };
      const tags = ['tag1', 'tag2'];

      await client.decorate({ metadata, tags }).wrap(async () => {
        const createdThread = await client
          .thread({ name: 'Test thread' })
          .upsert();

        const createdStep = await createdThread
          .step({ name: 'Test step', type: 'assistant_message' })
          .send();

        threadId = createdThread.id;
        stepId = createdStep.id;
      });

      await sleep(1000);

      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread?.metadata).toEqual(expect.objectContaining(metadata));
      expect(thread?.tags).toEqual(expect.arrayContaining(tags));
      expect(step?.metadata).toEqual(expect.objectContaining(metadata));
      expect(step?.tags).toEqual(expect.arrayContaining(tags));
    });

    it('creates the first step with the provided ID', async () => {
      const stepId = uuidv4();
      let generatedFirstStepId: Maybe<string>;
      let generatedSecondStepId: Maybe<string>;

      await client.decorate({ stepId }).wrap(async () => {
        const firstStep = await client.run({ name: 'First step' }).send();
        generatedFirstStepId = firstStep.id;

        const secondStep = await client.run({ name: 'Second step' }).send();
        generatedSecondStepId = secondStep.id;
      });

      expect(generatedFirstStepId).toBe(stepId);
      expect(generatedSecondStepId).not.toBe(stepId);
    });
  });

  // Skip for the CI
  describe('Integrations', () => {
    it('logs Langchain generations with the given ID, metadata and tags', async () => {
      const cb = client.instrumentation.langchain.literalCallback();
      const model = new ChatOpenAI({});

      const stepId = uuidv4();
      const metadata = { key: 'value' };
      const tags = ['tag1', 'tag2'];

      await client.decorate({ stepId, metadata, tags }).wrap(async () => {
        await model.invoke('Hello, how are you?', {
          callbacks: [cb]
        });
      });

      await sleep(1000);

      const step = await client.api.getStep(stepId);

      expect(step?.type).toBe('llm');
      expect(step?.id).toBe(stepId);
      expect(step?.metadata).toEqual(expect.objectContaining(metadata));
      expect(step?.tags).toEqual(expect.arrayContaining(tags));
    });

    it('logs LlamaIndex generations with the given ID, metadata and tags', async () => {
      client.instrumentation.llamaIndex.instrument();
      const engine = new SimpleChatEngine();

      const stepId = uuidv4();
      const metadata = { key: 'value' };
      const tags = ['tag1', 'tag2'];

      await client.decorate({ stepId, metadata, tags }).wrap(async () => {
        await engine.chat({
          message: 'Write a vegetarian lasagna recipe for 4 people.'
        });
      });

      await sleep(1000);

      const step = await client.api.getStep(stepId);

      expect(step?.type).toBe('llm');
      expect(step?.id).toBe(stepId);
      expect(step?.metadata).toEqual(expect.objectContaining(metadata));
      expect(step?.tags).toEqual(expect.arrayContaining(tags));
    }, 30_000);

    it('logs OpenAI generations with the given ID, metadata and tags', async () => {
      const openai = new OpenAI();
      client.instrumentation.openai();

      const stepId = uuidv4();
      const metadata = { key: 'value' };
      const tags = ['tag1', 'tag2'];

      await client.decorate({ stepId, metadata, tags }).wrap(async () => {
        await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is the capital of Canada?' }
          ]
        });
      });

      await sleep(1000);

      const step = await client.api.getStep(stepId);

      expect(step?.type).toBe('llm');
      expect(step?.id).toBe(stepId);
      expect(step?.metadata).toEqual(expect.objectContaining(metadata));
      expect(step?.tags).toEqual(expect.arrayContaining(tags));
    });

    it('logs Vercel AI SDK generations with the given ID, metadata and tags', async () => {
      const generateTextWithLiteralAI =
        client.instrumentation.vercel.instrument(generateText);

      const stepId = uuidv4();
      const metadata = { key: 'value' };
      const tags = ['tag1', 'tag2'];

      await client.decorate({ stepId, metadata, tags }).wrap(async () => {
        await generateTextWithLiteralAI({
          model: openai('gpt-3.5-turbo'),
          prompt: 'Write a vegetarian lasagna recipe for 4 people.'
        });
      });

      await sleep(1000);

      const step = await client.api.getStep(stepId);

      expect(step?.type).toBe('llm');
      expect(step?.id).toBe(stepId);
      expect(step?.metadata).toEqual(expect.objectContaining(metadata));
      expect(step?.tags).toEqual(expect.arrayContaining(tags));
    }, 30_000);
  });
});
