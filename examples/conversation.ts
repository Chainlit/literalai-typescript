import 'dotenv/config';
import { createReadStream } from 'fs';
import OpenAI from 'openai';

import { Attachment, LiteralClient } from '../src';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'] // This is the default and can be omitted
});

async function main() {
  const client = new LiteralClient();

  const userIdentifier = 'foobar';
  const participantId = await client.api.getOrCreateUser(userIdentifier);

  // Create the thread
  const thread = await client.thread({ participantId }).upsert();

  // Create the first step
  const step = await thread
    .step({
      name: userIdentifier,
      type: 'user_message',
      output: { content: 'Hello' }
    })
    .send();

  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages: [{ role: 'user', content: 'Say this is a test' }]
  });

  // Create a child llm step
  const childStep = step.childStep({
    name: 'gpt-4',
    type: 'llm',
    input: { content: 'Hello' }
  });

  // Instrument the openai response
  await client.instrumentation.openai(childStep, stream);

  // Send the child step
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
      output: { content: 'Final Answer!' },
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
