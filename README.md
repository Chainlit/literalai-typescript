# Literal AI Node API Library

This library provides convenient access to the Literal GraphQL API and other utilities.

## Installation

```shell
npm i @literalai/client
```

## Get an API key

To get an API key, go to the [Literal AI](https://cloud.getliteral.ai), create an account and copy your API key from the settings page.

## Usage

The full documentation of the SDK can be found [here](https://docs.getliteral.ai/typescript-client/introduction).

You can also find more involved examples in our [cookbooks repository](https://github.com/Chainlit/literal-cookbook).

### Basic usage

The following example will create a Thread on Literal AI and create a Step inside this Thread.

```typescript
import { LiteralClient } from '@literalai/client';

const client = new LiteralClient();

await client.thread({ name: 'Test Wrappers Thread' }).wrap(async () => {
  // You can access the current thread and step using the client
  const thread = client.getCurrentThread();

  // This step will be created with the thread as its parent
  await client
    .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
    .send();
});
```

### Advanced usage

The following example will create a Thread with a Run step nested inside. In the Run step, we will create two child steps: one for a retrieval and another for an LLM completion.

```typescript
import { LiteralClient } from '@literalai/client';

const client = new LiteralClient();

// Wrapped functions can be defined anywhere
// When they run, they will inherit the current thread and step from the context
const retrieve = async (_query: string) =>
  client.step({ name: 'Retrieve', type: 'retrieval' }).wrap(async () => {
    // Fetch data from the vector database ...

    return [
      { score: 0.8, text: 'France is a country in Europe' },
      { score: 0.7, text: 'Paris is the capital of France' }
    ]
  });

const completion = async (_query: string, _augmentations: string[]) =>
  client.step({ name: 'Completion', type: 'llm' }).wrap(async () => {
    // Fetch completions from the language model ...
    return { content: 'Paris is a city in Europe' };
  });

  // The output of wrapped functions will always bubble up the wrapper chain
  const result = await client
    .thread({ name: 'Test Wrappers Thread' })
    .wrap(async () => {
      return client.run({ name: 'Test Wrappers Run' }).wrap(async () => {
        const results = await retrieve(query);
        const augmentations = results.map((result) => result.text);
        const completionText = await completion(query, augmentations);
        return completionText.content;
      });
    });

  return result;
```
