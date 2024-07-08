import 'dotenv/config';

import { LiteralClient } from '../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient(apiKey, url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const initialQuery = 'What is the air speed velocity of an unladen swallow';

describe('Typescript decorators', () => {
  // describe('Thread decorator', () => {
  // @client.thread({ name: 'Test Decorator Thread' }).decorateClass
  // class ThreadWrappedClass {
  //     secret: string;

  //     constructor() {
  //       this.secret = "I'm a secret !";
  //     }

  //     async asyncMethod(query: string) {
  //       return {
  //         query,
  //         threadId: client.getCurrentThread()!.id
  //       };
  //     }

  //     method(query: string) {
  //       return {
  //         query,
  //         threadId: client.getCurrentThread()!.id
  //       };
  //     }

  //     methodThatMutatesThread() {
  //       client.getCurrentThread()!.name = 'Mutated Thread Name';

  //       return {
  //         content: "It's the final countdown !",
  //         threadId: client.getCurrentThread()!.id
  //       };
  //     }
  //   }

  //   it("doesn't inhibit the class' constructor", () => {
  //     const instance = new ThreadWrappedClass();

  //     expect(instance.secret).toEqual("I'm a secret !");
  //   });

  //   it('wraps the constructor of the decorated class', async () => {
  //     const instance = new ThreadWrappedClass();

  //     const { threadId: threadIdFromAsyncMethod } = await instance.asyncMethod(
  //       initialQuery
  //     );
  //     const { threadId: threadIdFromSyncMethod } =
  //       instance.method(initialQuery);
  //     await sleep(1000);
  //     const thread = await client.api.getThread(threadIdFromAsyncMethod);

  //     expect(threadIdFromAsyncMethod).toEqual(threadIdFromSyncMethod);
  //     expect(thread!.id).toEqual(threadIdFromAsyncMethod);
  //     expect(thread!.name).toEqual('Test Decorator Thread');
  //   });

  //   it("supports mutating a thread inside a method's body", async () => {
  //     const instance = new ThreadWrappedClass();

  //     const { content, threadId } = instance.methodThatMutatesThread();

  //     await sleep(1000);
  //     const thread = await client.api.getThread(threadId);

  //     expect(content).toEqual("It's the final countdown !");
  //     expect(thread!.name).toEqual('Mutated Thread Name');
  //   });
  // });

  // describe('Step decorator', () => {
  //   describe('Step class decorator', () => {
  //     @client.step({ name: 'Test Decorator Step', type: 'run' }).decorateClass
  //     class StepWrappedClass {
  //       async asyncMethod(query: string) {
  //         return {
  //           query,
  //           stepId: client.getCurrentStep()!.id
  //         };
  //       }

  //       method(query: string) {
  //         return {
  //           query,
  //           stepId: client.getCurrentStep()!.id
  //         };
  //       }

  //       methodThatMutatesStep() {
  //         client.getCurrentStep()!.name = 'Mutated Step Name';

  //         return {
  //           content: "It's the final countdown !",
  //           stepId: client.getCurrentStep()!.id
  //         };
  //       }
  //     }

  //     it('wraps the constructor of the decorated class', async () => {
  //       const instance = new StepWrappedClass();

  //       const { stepId: stepIdFromAsyncMethod } = await instance.asyncMethod(
  //         initialQuery
  //       );
  //       const { stepId: stepIdFromSyncMethod } = instance.method(initialQuery);
  //       await sleep(1000);
  //       const step = await client.api.getStep(stepIdFromAsyncMethod!);

  //       expect(stepIdFromAsyncMethod).toEqual(stepIdFromSyncMethod);
  //       expect(step!.id).toEqual(stepIdFromAsyncMethod);
  //       expect(step!.name).toEqual('Test Decorator Step');
  //       expect(step!.type).toEqual('run');
  //     });

  //     it("supports mutating a step inside a method's body", async () => {
  //       const instance = new StepWrappedClass();

  //       const { content, stepId } = instance.methodThatMutatesStep();

  //       await sleep(1000);
  //       const step = await client.api.getStep(stepId!);

  //       expect(content).toEqual("It's the final countdown !");
  //       expect(step!.name).toEqual('Mutated Step Name');
  //     });
  //   });

  //   describe('Step method decorator', () => {
  //     class StepWrappedClass {
  //       @client.step({ name: 'Test Decorator Step', type: 'run' })
  //         .decorateMethod
  //       async asyncMethod(query: string) {
  //         return {
  //           query,
  //           stepId: client.getCurrentStep()!.id
  //         };
  //       }

  //       @client.step({ name: 'Test Mutator Step', type: 'run' }).decorateMethod
  //       async methodThatMutatesStep() {
  //         client.getCurrentStep()!.name = 'Mutated Step Name';

  //         return {
  //           content: "It's the final countdown !",
  //           stepId: client.getCurrentStep()!.id
  //         };
  //       }
  //     }

  //     it('wraps the methods of the decorated class', async () => {
  //       const instance = new StepWrappedClass();

  //       const { stepId } = await instance.asyncMethod(initialQuery);
  //       await sleep(1000);
  //       const step = await client.api.getStep(stepId!);

  //       expect(step!.id).toEqual(stepId);
  //       expect(step!.name).toEqual('Test Decorator Step');
  //       expect(step!.type).toEqual('tool');
  //     });

  //     it("supports mutating a step inside a method's body", async () => {
  //       const instance = new StepWrappedClass();

  //       const { content, stepId } = await instance.methodThatMutatesStep();

  //       await sleep(1000);
  //       const step = await client.api.getStep(stepId!);

  //       expect(content).toEqual("It's the final countdown !");
  //       expect(step!.name).toEqual('Mutated Step Name');
  //       expect(step!.type).toEqual('assistant_message');
  //     });
  //   });
  // });

  // describe('Stacked Step & Thread decorator', () => {
  //   @client.step({ name: 'Test Decorator Step', type: 'run' }).decorateClass
  //   @client.thread({ name: 'Test Decorator Thread' }).decorateClass
  //   class StepWrappedClass {
  //     async asyncMethod(query: string) {
  //       return {
  //         query,
  //         threadId: client.getCurrentThread()!.id,
  //         stepId: client.getCurrentStep()!.id
  //       };
  //     }

  //     method(query: string) {
  //       return {
  //         query,
  //         threadId: client.getCurrentThread()!.id,
  //         stepId: client.getCurrentStep()!.id
  //       };
  //     }

  //     methodThatMutatesStepAndThread() {
  //       client.getCurrentThread()!.name = 'Mutated Thread Name';
  //       client.getCurrentStep()!.name = 'Mutated Step Name';

  //       return {
  //         content: "It's the final countdown !",
  //         threadId: client.getCurrentThread()!.id,
  //         stepId: client.getCurrentStep()!.id
  //       };
  //     }
  //   }
  //   it('wraps the constructor of the decorated class', async () => {
  //     const instance = new StepWrappedClass();

  //     const {
  //       stepId: stepIdFromAsyncMethod,
  //       threadId: threadIdFromAsyncMethod
  //     } = await instance.asyncMethod(initialQuery);
  //     const { stepId: stepIdFromSyncMethod, threadId: threadIdFromSyncMethod } =
  //       instance.method(initialQuery);
  //     await sleep(2000);
  //     const thread = await client.api.getThread(threadIdFromAsyncMethod);
  //     const step = await client.api.getStep(stepIdFromAsyncMethod!);

  //     expect(stepIdFromAsyncMethod).toEqual(stepIdFromSyncMethod);
  //     expect(threadIdFromAsyncMethod).toEqual(threadIdFromSyncMethod);

  //     expect(thread!.id).toEqual(threadIdFromAsyncMethod);
  //     expect(thread!.name).toEqual('Test Decorator Thread');

  //     expect(step!.id).toEqual(stepIdFromAsyncMethod);
  //     expect(step!.name).toEqual('Test Decorator Step');
  //   });

  //   it("supports mutating a step / thread inside a method's body", async () => {
  //     const instance = new StepWrappedClass();

  //     const { content, stepId, threadId } =
  //       instance.methodThatMutatesStepAndThread();

  //     await sleep(1000);
  //     const thread = await client.api.getThread(threadId);
  //     const step = await client.api.getStep(stepId!);

  //     expect(content).toEqual("It's the final countdown !");
  //     expect(step!.name).toEqual('Mutated Step Name');
  //     expect(thread!.name).toEqual('Mutated Thread Name');
  //   });

  //   it('nests the step inside the thread', async () => {
  //     const instance = new StepWrappedClass();

  //     const { stepId, threadId } = await instance.asyncMethod(initialQuery);
  //     await sleep(1000);
  //     const step = await client.api.getStep(stepId!);

  //     expect(step!.threadId).toEqual(threadId);
  //   });
  // });

  describe.only('Nested thread and step decorators', () => {
    @client.step({ name: 'Test Decorator Step', type: 'run' }).decorateClass
    @client.thread({ name: 'Test Decorator Thread' }).decorateClass
    class StepWrappedClass {
      getStepId() {
        return client.getCurrentStep()!.id;
      }

      @client.step({ name: 'Test Embedding Step', type: 'embedding' })
        .decorateMethod
      async embed(query: string) {
        return {
          query,
          threadId: client.getCurrentThread()!.id,
          stepId: client.getCurrentStep()!.id
        };
      }

      @client.step({ name: 'Test Completion Step', type: 'assistant_message' })
        .decorateMethod
      async completion() {
        return {
          content: "It's the final countdown !",
          threadId: client.getCurrentThread()!.id,
          stepId: client.getCurrentStep()!.id
        };
      }
    }

    it('wraps the methods of the decorated class', async () => {
      const instance = new StepWrappedClass();

      const initialStepId = instance.getStepId();

      const { stepId: embeddingStepId, threadId } = await instance.embed(
        initialQuery
      );
      const { stepId: completionStepId } = await instance.completion();
      await sleep(1000);
      const thread = await client.api.getThread(threadId);
      const initialStep = await client.api.getStep(initialStepId!);
      const embeddingStep = await client.api.getStep(embeddingStepId!);
      const completionStep = await client.api.getStep(completionStepId!);

      expect(thread!.name).toEqual('Test Decorator Thread');

      expect(initialStep!.type).toEqual('run');
      expect(initialStep!.threadId).toEqual(threadId);
      expect(initialStep!.name).toEqual('Test Decorator Step');
      expect(initialStep!.parentId).toBeNull();

      expect(embeddingStep!.type).toEqual('embedding');
      expect(embeddingStep!.threadId).toEqual(threadId);
      expect(embeddingStep!.parentId).toEqual(initialStepId);
      expect(embeddingStep!.name).toEqual('Test Embedding Step');

      expect(completionStep!.type).toEqual('assistant_message');
      expect(completionStep!.threadId).toEqual(threadId);
      expect(completionStep!.parentId).toEqual(initialStepId);
      expect(completionStep!.name).toEqual('Test Completion Step');
    });
  });
});
