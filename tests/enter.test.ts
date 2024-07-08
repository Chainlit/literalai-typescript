import 'dotenv/config';

import { LiteralClient, Maybe } from '../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient(apiKey, url);

describe('Context without callbacks', () => {
  it.skip('handles failing step', async () => {
    let threadId: Maybe<string>;
    let stepId: Maybe<string>;

    try {
      await client.thread({ name: 'Test Wrappers Thread' }).wrap(async () => {
        threadId = client.getCurrentThread()!.id;

        return client
          .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
          .wrap(async () => {
            stepId = client.getCurrentStep()!.id;

            throw new Error('Something bad happened');
          });
      });
    } catch (error) {
      expect((error as Error).message).toBe('Something bad happened');
    }

    const thread = await client.api.getThread(threadId!);
    const step = await client.api.getStep(stepId!);

    expect(thread).toBeNull();
    expect(step).toBeNull();
  });

  describe.only('Entering context', () => {
    it.only('handles simple use case', async () => {
      client.thread({ name: 'Test Wrappers Thread' }).enter();
      client
        .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
        .enter();

      const threadId = client.getCurrentThread()!.id;
      const stepId = client.getCurrentStep()!.id;

      client.getCurrentStep()!.name = 'Edited Test Wrappers Step';
      client.getCurrentStep()!.output = {
        content: 'Paris is a city in Europe'
      };

      await client.getCurrentStep()!.send();
      await client.getCurrentThread()!.upsert();

      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.name).toEqual('Test Wrappers Thread');

      expect(step!.name).toEqual('Edited Test Wrappers Step');
      expect(step!.threadId).toEqual(thread!.id);
      expect(step!.parentId).toBeNull();
      expect(step!.output).toEqual({ content: 'Paris is a city in Europe' });
    });

    it('handles nested steps', async () => {
      let threadId: Maybe<string>;
      let runId: Maybe<string>;
      let retrieveStepId: Maybe<string>;
      let completionStepId: Maybe<string>;

      const retrievedDocuments = [
        { score: 0.8, text: 'France is a country in Europe' },
        { score: 0.7, text: 'Paris is the capital of France' }
      ];

      const retrieve = async (_query: string) =>
        client.step({ name: 'Retrieve', type: 'retrieval' }).wrap(async () => {
          retrieveStepId = client.getCurrentStep()!.id;

          return retrievedDocuments;
        });

      const completion = async (_query: string, _augmentations: string[]) =>
        client.step({ name: 'Completion', type: 'llm' }).wrap(async () => {
          completionStepId = client.getCurrentStep()!.id;

          return { content: 'Paris is a city in Europe' };
        });

      const query = 'France';

      const result = await client
        .thread({ name: 'Test Wrappers Thread' })
        .wrap(async () => {
          threadId = client.getCurrentThread()!.id;

          return client.run({ name: 'Test Wrappers Run' }).wrap(async () => {
            runId = client.getCurrentStep()!.id;

            const results = await retrieve(query);
            const augmentations = results.map((result) => result.text);
            const completionText = await completion(query, augmentations);
            return completionText.content;
          });
        });

      const thread = await client.api.getThread(threadId!);
      const run = await client.api.getStep(runId!);
      const retrieveStep = await client.api.getStep(retrieveStepId!);
      const completionStep = await client.api.getStep(completionStepId!);

      expect(result).toBe('Paris is a city in Europe');

      expect(run!.threadId).toEqual(thread!.id);
      expect(run!.parentId).toBeNull();
      expect(run!.output).toEqual({ output: 'Paris is a city in Europe' });

      expect(retrieveStep!.threadId).toEqual(thread!.id);
      expect(retrieveStep!.parentId).toEqual(run!.id);
      expect(retrieveStep!.output).toEqual({ output: retrievedDocuments });

      expect(completionStep!.threadId).toEqual(thread!.id);
      expect(completionStep!.parentId).toEqual(run!.id);
      expect(completionStep!.output).toEqual({
        output: { content: 'Paris is a city in Europe' }
      });
    });

    it('handles steps outside of a thread', async () => {
      let runId: Maybe<string>;
      let stepId: Maybe<string>;

      const result = await client
        .run({ name: 'Test Wrappers Run' })
        .wrap(async () => {
          runId = client.getCurrentStep()!.id;

          return client
            .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
            .wrap(async () => {
              stepId = client.getCurrentStep()!.id;

              return 'Paris is a city in Europe';
            });
        });

      const run = await client.api.getStep(runId!);
      const step = await client.api.getStep(stepId!);

      expect(result).toBe('Paris is a city in Europe');

      expect(run!.name).toEqual('Test Wrappers Run');

      expect(step!.name).toEqual('Test Wrappers Step');
      expect(step!.threadId).toBeNull();
      expect(step!.parentId).toEqual(run!.id);
    });
  });

  describe('Updating the thread / step after the wrap', () => {
    it('updates the thread / step with a static object', async () => {
      let threadId: Maybe<string>;
      let stepId: Maybe<string>;

      await client.thread({ name: 'Test Wrappers Thread' }).wrap(
        async () => {
          threadId = client.getCurrentThread()!.id;

          return client
            .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
            .wrap(
              async () => {
                stepId = client.getCurrentStep()!.id;
                client.getCurrentStep()!.name = 'Edited Test Wrappers Step';

                return { content: 'Paris is a city in Europe' };
              },
              { metadata: { key: 'step-value' } }
            );
        },
        { metadata: { key: 'thread-value' } }
      );

      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.metadata!.key).toEqual('thread-value');
      expect(step!.metadata!.key).toEqual('step-value');
    });

    it('updates the thread / step based on the output of the wrap', async () => {
      let threadId: Maybe<string>;
      let stepId: Maybe<string>;

      await client.thread({ name: 'Test Wrappers Thread' }).wrap(
        async () => {
          threadId = client.getCurrentThread()!.id;

          return client
            .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
            .wrap(
              async () => {
                stepId = client.getCurrentStep()!.id;
                client.getCurrentStep()!.name = 'Edited Test Wrappers Step';

                return { content: 'Paris is a city in Europe' };
              },
              (output) => ({
                output: { type: 'assistant', message: output.content }
              })
            );
        },
        (output) => ({ metadata: { assistantMessage: output.content } })
      );

      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.metadata!.assistantMessage).toEqual(
        'Paris is a city in Europe'
      );
      expect(step!.output!.type).toEqual('assistant');
      expect(step!.output!.message).toEqual('Paris is a city in Europe');
    });

    it("updates a step's output and end time", async () => {});
  });

  describe('Editing current thread / step', () => {
    it('handles edition using the `getCurrentXXX` helpers', async () => {
      let threadId: Maybe<string>;
      let stepId: Maybe<string>;

      await client.thread({ name: 'Test Wrappers Thread' }).wrap(async () => {
        threadId = client.getCurrentThread()!.id;
        client.getCurrentThread()!.name = 'Edited Test Wrappers Thread';

        return client
          .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
          .wrap(async () => {
            stepId = client.getCurrentStep()!.id;
            client.getCurrentStep()!.name = 'Edited Test Wrappers Step';

            return 'Paris is a city in Europe';
          });
      });

      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.name).toEqual('Edited Test Wrappers Thread');
      expect(step!.name).toEqual('Edited Test Wrappers Step');
    });

    it('handles edition using the variable provided to the callback', async () => {
      let threadId: Maybe<string>;
      let stepId: Maybe<string>;

      await client
        .thread({ name: 'Test Wrappers Thread' })
        .wrap(async (thread) => {
          threadId = thread.id;
          thread.name = 'Edited Test Wrappers Thread';

          return client
            .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
            .wrap(async (step) => {
              stepId = step.id;
              step.name = 'Edited Test Wrappers Step';

              return 'Paris is a city in Europe';
            });
        });

      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.name).toEqual('Edited Test Wrappers Thread');
      expect(step!.name).toEqual('Edited Test Wrappers Step');
    });
  });
});
