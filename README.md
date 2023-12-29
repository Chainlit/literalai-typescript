# Chainlit Node API Library

This library provides convenient access to the Chainlit GraphQL API and other utilities.

## Installation

```shell
npm i @chainlit/client
```

## Get an API key

To get an API key, go to the [Chainlit Platform](https://staging.chainlit.io), create an account and copy your API key from the settings page.

## Usage

```ts
import { Chainlit } from '@chainlit/client';

const chainlit = new Chainlit(process.env['CHAINLIT_API_KEY']);
```

### Create/Update Threads

```ts
import { v4 as uuidv4 } from 'uuid';

const userIdentifier = 'foobar';
const participantId = await chainlit.api.getOrCreateUser(userIdentifier);

// Create the thread
const thread = await chainlit.thread({ id: uuidv4(), participantId }).upsert();
```

### Create/Update Steps

```ts
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
```

### Attach a File to a Step

```ts
const fileStream = createReadStream('PATH_TO_FILE');
const mime = 'image/png';

const { objectKey } = await chainlit.api.uploadFile({
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
```

### Add Feedback

```ts
const feedback = await chainlit.api.createFeedback({
  stepId: finalStep.id!,
  value: 1,
  comment: 'Great!'
});
```

## List/Export Threads

```ts
const first = 20;
const after = undefined;
const filter = { duration: { operator: 'gt' as const, value: 100000 } };

const threadList = await chainlit.api.listThreads(first, after, filter);

const threadsWithStep = await chainlit.api.exportThreads(after, filter);
```

## Monitor OpenAI Assistant Threads

Once you created an OpenAI Assistant and created a thread, you can sync that thread in the Chainlit Platform with one line of code.

This will keep track of:

- Messages, runs and tools input/output + duration
- Generated files
- Token consumption

```ts
import OpenAI from 'openai';

import { Chainlit, User } from '@chainlit/client';

const openai = new OpenAI();

const chainlit = new Chainlit(process.env['CHAINLIT_API_KEY']);
const syncer = chainlit.openai(openai).assistant.syncer;

async function main() {
  // You can sync a thread at any moment. We recommend to sync it once you get a `completed` run status.
  const threadId = 'THREAD_ID_TO_SYNC';

  // Optional: Add/update a user to the thread. Use any unique identifier you like.
  const user = new User({ identifier: 'willy', metadata: { name: 'Willy' } });
  await syncer.syncThread(threadId, user);
}

main();
```
