import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

import { Chainlit } from '../src';
import { ChatGeneration } from '../src/generation';

async function main() {
  const chainlit = new Chainlit();
  const userIdentifier = 'foobar';
  const participantId = await chainlit.api.getOrCreateUser(userIdentifier);

  // Create the tread
  const thread = await chainlit
    .thread({ id: uuidv4(), participantId })
    .upsert();

  // Create the first step
  const step = await thread
    .step({ name: userIdentifier, type: 'user_message', output: 'Hello' })
    .send();

  // Create a child step
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

  await thread
    .step({
      name: 'Assistant',
      type: 'assistant_message',
      output: fakeCompletion
    })
    .send();
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
