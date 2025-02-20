import axios from 'axios';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

import { ChatGeneration, IGenerationMessage, LiteralClient } from '../src';
import { sharedCache } from '../src/cache/sharedcache';
import { Dataset } from '../src/evaluation/dataset';
import { Score } from '../src/evaluation/score';
import { Prompt, PromptConstructor } from '../src/prompt-engineering/prompt';
import { sleep } from './utils';

describe('End to end tests for the SDK', function () {
  let client: LiteralClient;

  beforeAll(function () {
    const url = process.env.LITERAL_API_URL;
    const apiKey = process.env.LITERAL_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new LiteralClient({ apiKey, apiUrl: url });
  });

  it('should test user', async function () {
    const identifier = `test_user_${uuidv4()}`;
    const user = await client.api.createUser(identifier, { foo: 'bar' });

    expect(user.id).not.toBeNull();
    expect(user.metadata).toStrictEqual({ foo: 'bar' });

    const updatedUser = await client.api.updateUser(user.id!, identifier, {
      foo: 'baz'
    });
    expect(updatedUser.metadata).toStrictEqual({ foo: 'baz' });

    const fetchedUser = await client.api.getUser(identifier);
    expect(fetchedUser?.id).toBe(user.id);

    const users = await client.api.getUsers({
      first: 1
    });

    expect(users.data.length).toBe(1);

    await client.api.deleteUser(user.id!);

    const deletedUser = await client.api.getUser(identifier);
    expect(deletedUser).toBeUndefined();
  });

  it('should test generation', async function () {
    const generation = await client.api.createGeneration({
      provider: 'test',
      model: 'test',
      messages: [
        { role: 'system', content: 'Hello, how can I help you today?' }
      ]
    });

    expect(generation.id).not.toBeNull();

    const generations = await client.api.getGenerations({
      first: 1,
      orderBy: { column: 'createdAt', direction: 'DESC' }
    });
    expect(generations.data.length).toBe(1);
    expect(generations.data[0].id).toBe(generation.id);
  });

  it('should test thread with a single argument', async function () {
    const thread = await client.api.upsertThread({
      threadId: uuidv4(),
      name: 'name',
      metadata: { foo: 'bar' },
      tags: ['hello']
    });

    expect(thread.id).not.toBeNull();
    expect(thread.metadata).toStrictEqual({ foo: 'bar' });

    const fetchedThread = await client.api.getThread(thread.id);
    expect(fetchedThread?.id).toBe(thread.id);

    const updatedThread = await client.api.upsertThread({
      threadId: thread.id,
      name: 'test',
      metadata: { foo: 'baz' },
      tags: ['hello:world']
    });
    expect(updatedThread.tags).toStrictEqual(['hello:world']);

    await client.api.deleteThread(thread.id);

    const deletedThread = await client.api.getThread(thread.id);
    expect(deletedThread).toBeNull();
  });

  it('should test thread (deprecated)', async function () {
    const thread = await client.api.upsertThread(
      uuidv4(),
      'name',
      { foo: 'bar' },
      undefined,
      ['hello']
    );

    expect(thread.id).not.toBeNull();
    expect(thread.metadata).toStrictEqual({ foo: 'bar' });

    const fetchedThread = await client.api.getThread(thread.id);
    expect(fetchedThread?.id).toBe(thread.id);

    const updatedThread = await client.api.upsertThread(
      thread.id,
      'test',
      { foo: 'baz' },
      undefined,
      ['hello:world']
    );
    expect(updatedThread.tags).toStrictEqual(['hello:world']);

    await client.api.deleteThread(thread.id);

    // We have to await 5 seconds for the thread to disappear from the cache
    await sleep(5000);

    const deletedThread = await client.api.getThread(thread.id);
    expect(deletedThread).toBeNull();
  });

  it('should test export thread', async function () {
    const thread = await client.api.upsertThread({
      threadId: uuidv4(),
      name: 'test',
      metadata: { foo: 'bar' },
      tags: ['hello']
    });

    expect(thread.id).not.toBeNull();
    expect(thread.metadata).toStrictEqual({ foo: 'bar' });

    const threadsAfterNow = await client.api.getThreads({
      first: 1,
      filters: [
        {
          field: 'createdAt',
          operator: 'gt',
          value: new Date().toISOString()
        }
      ]
    });
    expect(threadsAfterNow.data.length).toBe(0);

    const threads = await client.api.getThreads({
      first: 1,
      orderBy: { column: 'createdAt', direction: 'DESC' }
    });
    expect(threads.data.length).toBeGreaterThan(0);
    expect(threads.data[0]['id']).toBe(thread.id);

    await client.api.deleteThread(thread.id);

    const deletedThread = await client.api.getThread(thread.id);
    expect(deletedThread).toBeNull();
  });

  it('should test run', async function () {
    const step = await client
      .run({
        name: 'test',
        error: 'test',
        metadata: { foo: 'bar' },
        generation: new ChatGeneration({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Hello, how can I help you today?' }
          ]
        })
      })
      .send();

    await sleep(2000);

    const fetchedStep = await client.api.getStep(step.id!);
    expect(fetchedStep?.id).toBe(step.id);
    expect(fetchedStep?.error).toBe('test');
    expect(fetchedStep?.metadata).toStrictEqual({ foo: 'bar' });
    expect(fetchedStep?.generation?.provider).toBe('openai');
    expect(fetchedStep?.generation?.model).toBe('gpt-3.5-turbo');

    await client.api.deleteStep(step.id!);

    const deletedStep = await client.api.getStep(step.id!);
    expect(deletedStep).toBeNull();
  });

  it('should test step', async function () {
    const thread = await client.thread({ id: uuidv4() });
    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        error: 'test',
        metadata: { foo: 'bar' },
        tags: ['hello'],
        generation: new ChatGeneration({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Hello, how can I help you today?' }
          ]
        })
      })
      .send();

    await sleep(2000);

    const fetchedStep = await client.api.getStep(step.id!);
    expect(fetchedStep?.id).toBe(step.id);
    expect(fetchedStep?.error).toBe('test');
    expect(fetchedStep?.metadata).toStrictEqual({ foo: 'bar' });
    expect(fetchedStep?.generation?.provider).toBe('openai');
    expect(fetchedStep?.generation?.model).toBe('gpt-3.5-turbo');

    await client.api.deleteStep(step.id!);

    const deletedStep = await client.api.getStep(step.id!);
    expect(deletedStep).toBeNull();
  });

  it('should test steps', async function () {
    const thread = await client.thread({ id: uuidv4() });

    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        tags: ['to_score']
      })
      .send();

    expect(step.id).not.toBeNull();

    await sleep(2000);

    const steps = await client.api.getSteps({
      filters: [
        {
          field: 'id',
          operator: 'eq',
          value: step.id!
        },
        {
          field: 'tags',
          operator: 'in',
          value: ['to_score']
        }
      ]
    });
    expect(steps.data.length).toBe(1);
    expect(steps.data[0].id).toBe(step.id);

    await client.api.deleteThread(thread.id);
  });

  it('should test score', async function () {
    const thread = await client.thread({ id: uuidv4() });
    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        metadata: { foo: 'bar' }
      })
      .send();

    await sleep(2000);

    const score = await client.api.createScore({
      stepId: step.id!,
      name: 'user-feedback',
      type: 'HUMAN',
      value: 1,
      comment: 'hello'
    });

    expect(score.id).not.toBeNull();
    expect(score.comment).toBe('hello');

    const updatedScore = await client.api.updateScore(score.id!, {
      comment: 'updated',
      value: 1
    });
    expect(updatedScore.value).toBe(1);
    expect(updatedScore.comment).toBe('updated');

    const scores = await client.api.getScores({
      first: 1,
      orderBy: { column: 'createdAt', direction: 'DESC' }
    });
    expect(scores.data.length).toBe(1);
    expect(scores.data[0].id).toBe(score.id);

    await client.api.deleteThread(thread.id);
  });

  it('should test scores', async function () {
    const thread = await client.thread({ id: uuidv4() });
    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        metadata: { foo: 'bar' }
      })
      .send();

    await sleep(1000);

    const firstScoreValue = 0.9234;
    const scores = await client.api.createScores([
      new Score({
        stepId: step.id!,
        name: 'Similarity',
        type: 'AI',
        value: firstScoreValue,
        comment: 'Automated eval run'
      }),
      new Score({
        stepId: step.id!,
        name: 'Factuality',
        type: 'AI',
        value: 1,
        scorer: 'openai:gpt-3.5-turbo'
      })
    ]);

    expect(scores.length).toEqual(2);
    expect(scores[0].value).toBe(firstScoreValue);
    expect(scores[1].scorer).toBe('openai:gpt-3.5-turbo');
  });

  it('should get project id', async () => {
    const projectId = await client.api.getProjectId();
    expect(projectId).toEqual(expect.any(String));
  });

  describe('dataset api', () => {
    it('should list datasets', async () => {
      const list = await client.api.getDatasets();
      expect(list).toBeInstanceOf(Array);
      expect(list[0]).toEqual({
        id: expect.any(String),
        name: expect.any(String)
      });
    });

    it('should create a dataset', async () => {
      const datasetName = `test_${uuidv4()}`;
      const dataset = await client.api.createDataset({
        name: datasetName,
        description: 'test',
        metadata: { foo: 'bar' }
      });

      expect(dataset.id).not.toBeNull();
      expect(dataset.createdAt).not.toBeNull();
      expect(dataset.name).toBe(datasetName);
      expect(dataset.description).toBe('test');
      expect(dataset.metadata).toStrictEqual({ foo: 'bar' });
      expect(dataset.type).toBe('key_value');
    });

    it('should create a generation dataset', async () => {
      const datasetName = `test_${uuidv4()}`;
      const dataset = await client.api.createDataset({
        name: datasetName,
        description: 'test',
        metadata: { foo: 'bar' },
        type: 'generation'
      });

      expect(dataset.id).not.toBeNull();
      expect(dataset.createdAt).not.toBeNull();
      expect(dataset.name).toBe(datasetName);
      expect(dataset.description).toBe('test');
      expect(dataset.metadata).toStrictEqual({ foo: 'bar' });
      expect(dataset.type).toBe('generation');
    });

    it('should update a dataset', async () => {
      const datasetName = `test_${uuidv4()}`;
      const dataset = await client.api.createDataset({
        name: datasetName,
        description: 'test',
        metadata: { foo: 'bar' }
      });

      const nextName = `test_${uuidv4()}`;
      await dataset.update({
        name: nextName,
        description: 'updated',
        metadata: { foo: 'baz' }
      });

      expect(dataset.name).toBe(nextName);
      expect(dataset.description).toBe('updated');
      expect(dataset.metadata).toStrictEqual({ foo: 'baz' });
    });

    it('should delete a dataset', async () => {
      const datasetName = `test_${uuidv4()}`;
      const dataset = await client.api.createDataset({
        name: datasetName,
        description: 'test',
        metadata: { foo: 'bar' }
      });
      await dataset.delete();
      const deletedDataset = await client.api.getDataset({ id: dataset.id });
      expect(deletedDataset).toBeNull();
    });

    it('should get a dataset', async () => {
      const datasetName = `test_${uuidv4()}`;
      const dataset = await client.api.createDataset({
        name: datasetName,
        description: 'test',
        metadata: { foo: 'bar' }
      });
      const fetchedDataset = await client.api.getDataset({ id: dataset.id });

      expect(fetchedDataset?.id).toBe(dataset.id);
      expect(fetchedDataset?.name).toBe(dataset.name);
      expect(fetchedDataset?.description).toBe(dataset.description);
      expect(fetchedDataset?.metadata).toStrictEqual(dataset.metadata);
      expect(fetchedDataset?.items).toEqual([]);
    });
  });

  describe('dataset experiment api', () => {
    it('should create a dataset experiment', async () => {
      const dataset = await client.api.createDataset({
        name: `test_${uuidv4()}`
      });
      const experiment = await client.api.createExperiment({
        name: `test_${uuidv4()}`,
        datasetId: dataset.id
      });

      expect(experiment.id).not.toBeNull();
      dataset.delete();
    });

    it('should create a dataset experiment with a prompt variant', async () => {
      const promptVariantId = await client.api.createPromptVariant(
        'Default',
        [{ role: 'user', content: 'hello' }],
        { temperature: 0.5 }
      );
      const experiment = await client.api.createExperiment({
        name: `test_${uuidv4()}`,
        promptVariantId: promptVariantId
      });
      expect(promptVariantId).toBeDefined();
      expect(experiment.id).not.toBeNull();
    });
  });

  describe('dataset item api', () => {
    let dataset: Dataset;
    let generationDataset: Dataset;

    beforeAll(async () => {
      dataset = await client.api.createDataset({
        name: `test_${uuidv4()}`
      });
      generationDataset = await client.api.createDataset({
        name: `test_${uuidv4()}`,
        type: 'generation'
      });
    });

    it('should create a dataset item', async () => {
      await dataset.createItem({
        input: { foo: 'bar' },
        expectedOutput: { foo: 'baz' },
        metadata: { foo: 'bar' }
      });

      const datasetItem = dataset.items[0];

      expect(datasetItem.id).not.toBeNull();
      expect(datasetItem.createdAt).not.toBeNull();
      expect(datasetItem.input).toStrictEqual({ foo: 'bar' });
      expect(datasetItem.expectedOutput).toStrictEqual({ foo: 'baz' });
      expect(datasetItem.metadata).toStrictEqual({ foo: 'bar' });
    });

    it('should delete a dataset item', async () => {
      const datasetItem = await dataset.createItem({
        input: { foo: 'bar' }
      });
      expect(dataset.items.length).toBe(2);

      const deletedDatasetItem = await dataset.deleteItem(datasetItem.id);

      expect(dataset.items.length).toBe(1);

      expect(deletedDatasetItem).not.toBeNull();
    });

    it('should get a dataset item', async () => {
      const datasetItem = await dataset.createItem({
        input: { foo: 'bar' }
      });
      const fetchedDatasetItem = await client.api.getDatasetItem(
        datasetItem.id
      );

      expect(fetchedDatasetItem.id).toBe(datasetItem.id);
      expect(fetchedDatasetItem.input).toStrictEqual(datasetItem.input);
    });

    it('should get a dataset item through dataset', async () => {
      const fetchedDataset = await client.api.getDataset({ id: dataset.id });

      expect(fetchedDataset?.items.length).toBeGreaterThan(0);
    });

    it('should add a step to a dataset', async () => {
      const thread = await client.thread({ id: uuidv4() });
      const step = await thread
        .step({
          name: 'Run',
          type: 'run',
          input: { content: 'hello' },
          output: { content: 'hello!' }
        })
        .send();

      await step
        .step({
          name: 'gpt-4o',
          type: 'llm',
          input: { content: 'hello' },
          output: { content: 'hello!' }
        })
        .send();

      await sleep(1000);

      const datasetItem = await dataset.addStep(step.id!);

      expect(datasetItem.id).not.toBeNull();
      expect(datasetItem.input).toStrictEqual({ content: 'hello' });
      expect(datasetItem.expectedOutput).toStrictEqual({ content: 'hello!' });
      expect(datasetItem.intermediarySteps).toHaveLength(1);
    });

    it('should create a generation dataset item', async () => {
      const datasetItem = await generationDataset.createItem({
        input: { messages: [{ role: 'user', content: 'input' }] },
        expectedOutput: { role: 'assistant', content: 'output' },
        metadata: { type: 'CHAT' }
      });

      expect(datasetItem.id).not.toBeNull();
      expect(datasetItem.createdAt).not.toBeNull();
      expect(datasetItem.input).toStrictEqual({
        messages: [{ role: 'user', content: 'input' }]
      });
      expect(datasetItem.expectedOutput).toStrictEqual({
        role: 'assistant',
        content: 'output'
      });
      expect(datasetItem.metadata).toStrictEqual({ type: 'CHAT' });
    });

    it('should add a generation to a dataset', async () => {
      const generation = await client.api.createGeneration({
        provider: 'test',
        model: 'test',
        messages: [
          { role: 'system', content: 'Hello, how can I help you today?' }
        ]
      });

      if (generation?.id == null) {
        throw new Error('Could not create a generation');
      }
      const datasetItem = await generationDataset.addGeneration(generation.id);

      expect(datasetItem.id).not.toBeNull();
      expect(datasetItem.createdAt).not.toBeNull();
      expect(datasetItem.input).not.toBeNull();
      expect(datasetItem.expectedOutput).not.toBeNull();
      expect(datasetItem.metadata.promptType).toBe('CHAT');
    });
  });

  describe('Prompt api', () => {
    const mockPromptData: PromptConstructor = {
      id: 'test-id',
      name: 'test-prompt',
      version: 1,
      createdAt: new Date().toISOString(),
      type: 'CHAT',
      templateMessages: [],
      tools: [],
      settings: {
        provider: 'test',
        model: 'test',
        frequency_penalty: 0,
        presence_penalty: 0,
        temperature: 0,
        top_p: 0,
        max_tokens: 0
      },
      variables: [],
      variablesDefaultValues: {},
      metadata: {},
      items: [],
      provider: 'test'
    };

    it('should get a prompt by name', async () => {
      const prompt = await client.api.getPrompt('Default');

      expect(prompt).not.toBeNull();
      expect(prompt?.name).toBe('Default');
    });

    it('should get a prompt by id', async () => {
      const prompt = await client.api.getPrompt('Default', 0);

      const fetchedPrompt = await client.api.getPromptById(prompt!.id);

      expect(fetchedPrompt).not.toBeNull();
      expect(fetchedPrompt?.name).toBe('Default');
      expect(fetchedPrompt?.version).toBe(0);
    });

    it('should get the URL for the prompt', async () => {
      const prompt = await client.api.getPrompt('Default', 0);
      const projectId = await client.api.getProjectId();

      expect(prompt?.url).toContain(
        `projects/${projectId}/playground?name=Default&version=0`
      );
    });

    it('should format a prompt with default values', async () => {
      const prompt = await client.api.getPrompt('Default', 0);

      const formatted = prompt!.formatMessages();

      const expected = `Hello, this is a test value and this

* item 0
* item 1
* item 2

is a templated list.`;

      expect(formatted.length).toBe(1);
      expect(formatted[0].content).toBe(expected);
    });

    it('should format a prompt with custom values', async () => {
      const prompt = await client.api.getPrompt('Default', 0);

      const formatted = prompt!.formatMessages({ test_var: 'Edited value' });

      const expected = `Hello, this is a Edited value and this

* item 0
* item 1
* item 2

is a templated list.`;

      expect(formatted.length).toBe(1);
      expect(formatted[0].content).toBe(expected);
    });

    it('should fallback to cache when getPromptById DB call fails', async () => {
      const prompt = new Prompt(client.api, mockPromptData);
      sharedCache.put(prompt.id, prompt);
      sharedCache.put(prompt.name, prompt);
      sharedCache.put(`${prompt.name}:${prompt.version}`, prompt);

      jest
        .spyOn(client.api as any, 'makeGqlCall')
        .mockRejectedValueOnce(new Error('DB Error'));

      const result = await client.api.getPromptById(prompt.id);
      expect(result).toEqual(prompt);
    });

    it('should fallback to cache when getPrompt DB call fails', async () => {
      const prompt = new Prompt(client.api, mockPromptData);

      sharedCache.put(prompt.id, prompt);
      sharedCache.put(prompt.name, prompt);
      sharedCache.put(`${prompt.name}:${prompt.version}`, prompt);

      jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('DB Error'));

      const result = await client.api.getPrompt(prompt.id);
      expect(result).toEqual(prompt);
    });

    it('should update cache with fresh data on successful DB call', async () => {
      const prompt = new Prompt(client.api, mockPromptData);

      jest.spyOn(client.api as any, 'makeGqlCall').mockResolvedValueOnce({
        data: { promptVersion: prompt }
      });

      await client.api.getPromptById(prompt.id);

      const cachedPrompt = sharedCache.get(prompt.id);
      expect(cachedPrompt).toBeDefined();
      expect(cachedPrompt?.id).toBe(prompt.id);
    });

    it('should return null when both DB and cache fail', async () => {
      jest
        .spyOn(client.api as any, 'makeGqlCall')
        .mockRejectedValueOnce(new Error('DB Error'));

      const result = await client.api.getPromptById('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should get a prompt A/B testing configuration', async () => {
      const promptName = 'TypeScript SDK E2E Tests';

      const v0: IGenerationMessage[] = [{ role: 'user', content: 'Hello' }];
      const v1: IGenerationMessage[] = [{ role: 'user', content: 'Hello 2' }];

      const promptV0 = await client.api.getOrCreatePrompt(promptName, v0);

      await client.api.updatePromptAbTesting(promptV0.name, [
        { version: 0, rollout: 100 }
      ]);

      let abTesting = await client.api.getPromptAbTesting(promptName);

      if (!abTesting) {
        throw new Error('Prompt AB testing not found');
      }

      expect(abTesting.length).toBe(1);
      expect(abTesting[0].version).toBe(0);
      expect(abTesting[0].rollout).toBe(100);

      const promptV1 = await client.api.getOrCreatePrompt(promptName, v1);

      await client.api.updatePromptAbTesting(promptV1.name, [
        { version: 0, rollout: 60 },
        { version: 1, rollout: 40 }
      ]);

      abTesting = await client.api.getPromptAbTesting(promptV1.name);

      if (!abTesting) {
        throw new Error('Prompt AB testing not found');
      }

      abTesting.sort((a, b) => a.version - b.version);

      expect(abTesting.length).toBe(2);
      expect(abTesting[0].version).toBe(0);
      expect(abTesting[0].rollout).toBe(60);
      expect(abTesting[1].version).toBe(1);
      expect(abTesting[1].rollout).toBe(40);
    });
  });
});
