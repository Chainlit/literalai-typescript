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
import { Chainlit } from "@chainlit/client";

const chainlit = new Chainlit(process.env["CHAINLIT_API_KEY"]);
```

## Monitor OpenAI Assistant Threads

Once you created an OpenAI Assistant and created a thread, you can sync that thread in the Chainlit Platform with one line of code.

This will keep track of:

- Messages, runs and tools input/output + duration
- Generated files
- Token consumption

```ts
import { Chainlit } from "@chainlit/client";
import OpenAI from "openai";

const openai = new OpenAI();

const chainlit = new Chainlit(process.env["CHAINLIT_API_KEY"]);
const syncer = chainlit.openaiAssistantSyncer(openai);

async function main() {
  // You can sync a thread at any moment. We recommend to sync it once you get a `completed` run status.
  const threadId = "THREAD_ID_TO_SYNC";

  // Optional: Add/update a user to the thread. Use any unique identifier you like.
  const user = new User({ identifier: "willy", metadata: { name: "Willy" } });
  await syncer.syncThread(threadId, user);
}

main();
```
