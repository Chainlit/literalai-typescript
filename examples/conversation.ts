import 'dotenv/config';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { Attachment, ChatGeneration, LiteralClient } from '../src';

async function main() {
  const client = new LiteralClient();

  const userIdentifier = 'foobar';
  const participantId = await client.api.getOrCreateUser(userIdentifier);

  // Create the thread
  const thread = await client.thread({ id: uuidv4(), participantId }).upsert();

  // Create the first step
  const step = await thread
    .step({ name: userIdentifier, type: 'user_message', output: 'Hello' })
    .send();

  // Create a child llm step
  const childStep = step.childStep({
    name: 'gpt-4',
    type: 'llm',
    input: 'Hello'
  });

  // Faking call to GPT-4
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const fakeCompletion = 'Hello, how are you?';

  childStep.generation = new ChatGeneration({
    messages: [{ role: 'user', formatted: 'Hello' }],
    provider: 'openai',
    settings: { model: 'gpt-4' },
    completion: fakeCompletion
  });
  childStep.output = fakeCompletion;
  await childStep.send();

  // Upload an attachment
  const fileStream = createReadStream('./tests/integration/chainlit-logo.png');
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

  const finalStep = await thread
    .step({
      name: 'Assistant',
      type: 'assistant_message',
      output: fakeCompletion,
      attachments: [attachment]
    })
    .send();

  const feedback = await client.api.createFeedback({
    stepId: finalStep.id!,
    value: 1,
    comment: 'Great!'
  });

  await client.api.updateFeedback(feedback.id!, { comment: 'Updated!' });
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
