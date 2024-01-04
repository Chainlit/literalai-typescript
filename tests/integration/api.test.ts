import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { Attachment, Chainlit } from '../../src';

describe('End to end tests for the SDK', function () {
  let client: Chainlit;

  beforeAll(function () {
    const url = process.env.CHAINLIT_API_URL;
    const apiKey = process.env.CHAINLIT_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new Chainlit(apiKey, url);
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

  it('should test step', async function () {
    const thread = await client.thread({ id: uuidv4() });
    const step = await thread
      .step({
        name: 'test',
        type: 'run',
        metadata: { foo: 'bar' }
      })
      .send();

    const fetchedStep = await client.api.getStep(step.id!);
    expect(fetchedStep?.id).toBe(step.id);

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

  it('should test ParticipantSession', async function () {
    const session = await client.api.createUserSession(
      undefined,
      undefined,
      true,
      undefined,
      'foo',
      undefined,
      undefined
    );

    expect(session.id).not.toBeNull();
    expect(session.anonParticipantIdentifier).toBe('foo');

    const updatedSession = await client.api.updateUserSession(
      session.id!,
      undefined,
      undefined,
      { foo: 'bar' }
    );
    expect(session.id).toBe(updatedSession.id);
    expect(updatedSession.metadata).toStrictEqual({ foo: 'bar' });

    const fetchedSession = await client.api.getUserSession(session.id!);
    expect(fetchedSession?.id).toBe(session.id);

    await client.api.deleteUserSession(session.id!);

    const deletedSession = await client.api.getUserSession(session.id!);
    expect(deletedSession).toBeNull();
  });
});