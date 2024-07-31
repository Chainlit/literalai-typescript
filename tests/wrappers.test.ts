import 'dotenv/config';

import { LiteralClient, Maybe } from '../src';
import { DatasetExperimentItem } from '../src/evaluation/dataset';
import { Step } from '../src/observability/step';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient({ apiKey, apiUrl: url });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Wrapper', () => {
  it('handles failing step', async () => {
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

  describe('Wrapping', () => {
    it('handles simple use case', async () => {
      let threadId: Maybe<string>;
      let stepId: Maybe<string>;

      const result = await client
        .thread({ name: 'Test Wrappers Thread' })
        .wrap(async () => {
          threadId = client.getCurrentThread()!.id;

          return client
            .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
            .wrap(async () => {
              stepId = client.getCurrentStep()!.id;

              return 'Paris is a city in Europe';
            });
        });

      await sleep(1000);
      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(result).toBe('Paris is a city in Europe');

      expect(thread!.name).toEqual('Test Wrappers Thread');

      expect(step!.name).toEqual('Test Wrappers Step');
      expect(step!.threadId).toEqual(thread!.id);
      expect(step!.parentId).toBeNull();
      expect(step!.output).toEqual({ output: 'Paris is a city in Europe' });
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

      await sleep(1000);
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
        content: 'Paris is a city in Europe'
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

      await sleep(1000);
      const run = await client.api.getStep(runId!);
      const step = await client.api.getStep(stepId!);

      expect(result).toBe('Paris is a city in Europe');

      expect(run!.name).toEqual('Test Wrappers Run');

      expect(step!.name).toEqual('Test Wrappers Step');
      expect(step!.threadId).toBeNull();
      expect(step!.parentId).toEqual(run!.id);
    });

    it("doesn't leak the current store when getting entities from the API", async () => {
      let fetchedOldStep: Maybe<Step>;

      const oldStep = await client
        .step({ name: 'Test Old Step', type: 'run' })
        .send();

      await client.thread({ name: 'Test Wrappers Thread' }).wrap(async () => {
        return client
          .step({ name: 'Test Wrappers Step', type: 'assistant_message' })
          .wrap(async () => {
            fetchedOldStep = await client.api.getStep(oldStep!.id!);

            return 'Paris is a city in Europe';
          });
      });

      expect(fetchedOldStep!.parentId).toBeNull();
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

      await sleep(1000);
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

      await sleep(1000);
      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.metadata!.assistantMessage).toEqual(
        'Paris is a city in Europe'
      );
      expect(step!.output!.type).toEqual('assistant');
      expect(step!.output!.message).toEqual('Paris is a city in Europe');
    });
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

      await sleep(1000);
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

      await sleep(1000);
      const thread = await client.api.getThread(threadId!);
      const step = await client.api.getStep(stepId!);

      expect(thread!.name).toEqual('Edited Test Wrappers Thread');
      expect(step!.name).toEqual('Edited Test Wrappers Step');
    });
  });

  describe('Wrapping existing steps and threads', () => {
    it('wraps an existing thread', async () => {
      const { id: threadId } = await client
        .thread({ name: 'Test Wrappers Thread' })
        .upsert();

      await sleep(1000);
      const thread = await client.api.getThread(threadId);

      const wrappedThreadId = await thread!.wrap(async () => {
        return client.getCurrentThread()!.id;
      });

      expect(wrappedThreadId).toEqual(threadId);
    });

    it('wraps an existing step', async () => {
      const { id: stepId } = await client
        .run({ name: 'Test Wrappers Thread' })
        .send();

      await sleep(1000);
      const step = await client.api.getStep(stepId!);

      const wrappedStepId = await step!.wrap(async () => {
        return client.getCurrentStep()!.id;
      });

      expect(wrappedStepId).toEqual(stepId);
    });
  });

  describe('Wrapping experimentRun', () => {
    it('wraps an experiment run', async () => {
      const experiment = await client.api.createExperiment({
        name: 'Test Experiment Run'
      });
      let persistedExperimentItem: DatasetExperimentItem | undefined =
        undefined;

      await client.experimentItemRun().wrap(async () => {
        const scores = [
          {
            name: 'context_relevancy',
            type: 'AI' as const,
            value: 0.6
          }
        ];
        await client.step({ name: 'agent', type: 'run' }).wrap(async () => {
          const experimentItem = {
            scores: scores, // scores in the format above
            input: { question: 'question' },
            output: { content: 'answer' }
          };
          persistedExperimentItem = await experiment.log(experimentItem);
        });
      });
      expect(persistedExperimentItem).toBeTruthy();

      await sleep(1000);

      const experimentRunId = persistedExperimentItem!.experimentRunId;
      expect(experimentRunId).toBeTruthy();
      const experimentRun = await client.api.getStep(experimentRunId!);
      expect(experimentRun).toBeTruthy();
      expect(experimentRun?.environment).toEqual('experiment');
    });
  });

  describe('Concurrency', () => {
    it("doesn't mix up threads and steps", async () => {
      let firstThreadId: Maybe<string>;
      let secondThreadId: Maybe<string>;
      let firstStep: Maybe<Step>;
      let secondStep: Maybe<Step>;

      await Promise.all([
        client.thread({ name: 'Thread 1' }).wrap(async () => {
          firstThreadId = client.getCurrentThread()!.id;

          return client
            .step({ name: 'Step 1', type: 'assistant_message' })
            .wrap(async () => {
              firstStep = client.getCurrentStep();
              return 'Paris is a city in Europe';
            });
        }),
        client.thread({ name: 'Thread 2' }).wrap(async () => {
          secondThreadId = client.getCurrentThread()!.id;

          return client
            .step({ name: 'Step 2', type: 'assistant_message' })
            .wrap(async () => {
              secondStep = client.getCurrentStep();
              return 'London is a city in Europe';
            });
        })
      ]);

      expect(firstThreadId).not.toEqual(secondThreadId);
      expect(firstStep?.threadId).toEqual(firstThreadId);
      expect(secondStep?.threadId).toEqual(secondThreadId);
    });
  });
});
