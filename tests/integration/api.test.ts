import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { Attachment, ChatGeneration, Dataset, LiteralClient } from '../../src';

describe('End to end tests for the SDK', function () {
  let client: LiteralClient;

  beforeAll(function () {
    const url = process.env.LITERAL_API_URL;
    const apiKey = process.env.LITERAL_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new LiteralClient(apiKey, url);
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

  it('should test thread', async function () {
    const thread = await client.api.upsertThread(
      uuidv4(),
      'name',
      { foo: 'bar' },
      undefined,
      undefined,
      ['hello']
    );

    expect(thread.id).not.toBeNull();
    expect(thread.metadata).toStrictEqual({ foo: 'bar' });

    const fetchedThread = await client.api.getThread(thread.id);
    expect(fetchedThread.id).toBe(thread.id);

    const updatedThread = await client.api.upsertThread(
      thread.id,
      'test',
      { foo: 'baz' },
      undefined,
      undefined,
      ['hello:world']
    );
    expect(updatedThread.tags).toStrictEqual(['hello:world']);

    await client.api.deleteThread(thread.id);

    const deletedThread = await client.api.getThread(thread.id);
    expect(deletedThread).toBeNull();
  });

  it('should test export thread', async function () {
    const thread = await client.api.upsertThread(
      uuidv4(),
      'test',
      { foo: 'bar' },
      undefined,
      undefined,
      ['hello']
    );

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

  it('should test score', async function () {
    const thread = await client.thread({ id: uuidv4() });
    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        metadata: { foo: 'bar' }
      })
      .send();

    await new Promise((resolve) => setTimeout(resolve, 1000));

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

  it('should test attachment', async function () {
    const thread = await client.thread({ id: uuidv4() });
    // Upload an attachment
    const fileStream = createReadStream(
      './tests/integration/chainlit-logo.png'
    );
    const mime = 'image/png';

    const { objectKey } = await client.api.uploadFile({
      threadId: thread.id,
      content: fileStream,
      mime
    });

    const attachment = new Attachment({
      name: 'test',
      objectKey,
      mime
    });

    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        attachments: [attachment]
      })
      .send();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const fetchedStep = await client.api.getStep(step.id!);
    expect(fetchedStep?.attachments?.length).toBe(1);
    expect(fetchedStep?.attachments![0].objectKey).toBe(objectKey);
    expect(fetchedStep?.attachments![0].url).toBeDefined();

    await client.api.deleteThread(thread.id);
  });

  describe('dataset api', () => {
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
      const deletedDataset = await client.api.getDataset(dataset.id);
      expect(deletedDataset).toBeNull();
    });

    it('should get a dataset', async () => {
      const datasetName = `test_${uuidv4()}`;
      const dataset = await client.api.createDataset({
        name: datasetName,
        description: 'test',
        metadata: { foo: 'bar' }
      });
      const fetchedDataset = await client.api.getDataset(dataset.id);

      expect(fetchedDataset?.id).toBe(dataset.id);
      expect(fetchedDataset?.name).toBe(dataset.name);
      expect(fetchedDataset?.description).toBe(dataset.description);
      expect(fetchedDataset?.metadata).toStrictEqual(dataset.metadata);
      expect(fetchedDataset?.items).toEqual([]);
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
      const fetchedDataset = await client.api.getDataset(dataset.id);

      expect(fetchedDataset?.items.length).toBeGreaterThan(0);
    });

    it('should add a step to a dataset', async () => {
      const thread = await client.thread({ id: uuidv4() }).upsert();
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
          name: 'gpt-4',
          type: 'llm',
          input: { content: 'hello' },
          output: { content: 'hello!' }
        })
        .send();

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
      expect(datasetItem.metadata.type).toBe('CHAT');
    });
  });

  describe('Prompt api', () => {
    it('should get a prompt', async () => {
      const prompt = await client.api.getPrompt('Default');

      expect(prompt).not.toBeNull();
      expect(prompt?.name).toBe('Default');
      expect(prompt?.version).toBe(0);
    });

    it('should format a prompt with default values', async () => {
      const prompt = await client.api.getPrompt('Default');

      const formatted = prompt!.format();

      const expected = `Hello, this is a test value and this

* item 0
* item 1
* item 2

is a templated list.`;

      expect(formatted.length).toBe(1);
      expect(formatted[0].content).toBe(expected);
    });

    it('should format a prompt with custom values', async () => {
      const prompt = await client.api.getPrompt('Default');

      const formatted = prompt!.format({ test_var: 'Edited value' });

      const expected = `Hello, this is a Edited value and this

* item 0
* item 1
* item 2

is a templated list.`;

      expect(formatted.length).toBe(1);
      expect(formatted[0].content).toBe(expected);
    });
  });
});
