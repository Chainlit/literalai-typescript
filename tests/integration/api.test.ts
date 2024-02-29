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

    await client.api.deleteUser(user.id!);

    const deletedUser = await client.api.getUser(identifier);
    expect(deletedUser).toBeUndefined();
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

    const threads = await client.api.listThreads(1);
    expect(threads.data.length).toBe(1);

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

    const threadsAfterNow = await client.api.exportThreads(1, {
      createdAt: { operator: 'gt', value: new Date().toISOString() }
    });
    expect(threadsAfterNow.data.length).toBe(0);

    const threads = await client.api.exportThreads();
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

  it('should test feedback', async function () {
    const thread = await client.thread({ id: uuidv4() });
    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        metadata: { foo: 'bar' }
      })
      .send();

    const feedback = await client.api.createFeedback({
      stepId: step.id!,
      value: 1,
      comment: 'hello'
    });

    expect(feedback.id).not.toBeNull();
    expect(feedback.comment).toBe('hello');

    const updatedFeedback = await client.api.updateFeedback(feedback.id!, {
      comment: 'updated'
    });
    expect(updatedFeedback.value).toBe(1);
    expect(updatedFeedback.comment).toBe('updated');

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

    const fetchedStep = await client.api.getStep(step.id!);
    expect(fetchedStep?.attachments?.length).toBe(1);
    expect(fetchedStep?.attachments![0].objectKey).toBe(objectKey);
    expect(fetchedStep?.attachments![0].url).toBeDefined();

    await client.api.deleteThread(thread.id);
  });

  describe('dataset api', () => {
    it('should create a dataset', async () => {
      const dataset = await client.api.createDataset({
        name: 'test',
        description: 'test',
        metadata: { foo: 'bar' }
      });

      expect(dataset.id).not.toBeNull();
      expect(dataset.createdAt).not.toBeNull();
      expect(dataset.name).toBe('test');
      expect(dataset.description).toBe('test');
      expect(dataset.metadata).toStrictEqual({ foo: 'bar' });
    });

    it('should update a dataset', async () => {
      const dataset = await client.api.createDataset({
        name: 'test',
        description: 'test',
        metadata: { foo: 'bar' }
      });
      const updatedDataset = await client.api.updateDataset(dataset.id, {
        name: 'updated',
        description: 'updated',
        metadata: { foo: 'baz' }
      });

      expect(updatedDataset.name).toBe('updated');
      expect(updatedDataset.description).toBe('updated');
      expect(updatedDataset.metadata).toStrictEqual({ foo: 'baz' });
    });

    it('should delete a dataset', async () => {
      const dataset = await client.api.createDataset({
        name: 'test',
        description: 'test',
        metadata: { foo: 'bar' }
      });
      const deletedDataset = await client.api.deleteDataset(dataset.id);

      expect(deletedDataset).not.toBeNull();
    });

    it('should get a dataset', async () => {
      const dataset = await client.api.createDataset({
        name: 'test',
        description: 'test',
        metadata: { foo: 'bar' }
      });
      const fetchedDataset = await client.api.getDataset(dataset.id);

      expect(fetchedDataset.id).toBe(dataset.id);
      expect(fetchedDataset.name).toBe(dataset.name);
      expect(fetchedDataset.description).toBe(dataset.description);
      expect(fetchedDataset.metadata).toStrictEqual(dataset.metadata);
      expect(fetchedDataset.items).toEqual([]);
    });
  });

  describe('dataset item api', () => {
    let dataset: Dataset;

    beforeAll(async () => {
      dataset = await client.api.createDataset();
    });

    it('should create a dataset item', async () => {
      const datasetItem = await client.api.createDatasetItem(dataset.id, {
        input: { foo: 'bar' },
        expectedOutput: { foo: 'baz' },
        metadata: { foo: 'bar' }
      });

      expect(datasetItem.id).not.toBeNull();
      expect(datasetItem.createdAt).not.toBeNull();
      expect(datasetItem.input).toStrictEqual({ foo: 'bar' });
      expect(datasetItem.expectedOutput).toStrictEqual({ foo: 'baz' });
      expect(datasetItem.metadata).toStrictEqual({ foo: 'bar' });
    });

    it('should delete a dataset item', async () => {
      const datasetItem = await client.api.createDatasetItem(dataset.id, {
        input: { foo: 'bar' }
      });
      const deletedDatasetItem = await client.api.deleteDatasetItem(
        datasetItem.id
      );

      expect(deletedDatasetItem).not.toBeNull();
    });

    it('should get a dataset item', async () => {
      const datasetItem = await client.api.createDatasetItem(dataset.id, {
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

      expect(fetchedDataset.items?.length).toBeGreaterThan(0);
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

      const datasetItem = await client.api.addStepToDataset(
        dataset.id,
        step.id!
      );

      expect(datasetItem.id).not.toBeNull();
      expect(datasetItem.input).toStrictEqual({ content: 'hello' });
      expect(datasetItem.expectedOutput).toStrictEqual({ content: 'hello!' });
      expect(datasetItem.intermediarySteps).toHaveLength(1);
    });
  });
});
