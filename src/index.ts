import { AsyncLocalStorage } from 'node:async_hooks';

import { API } from './api';
import instrumentation from './instrumentation';
import openai from './openai';
import { Step, StepConstructor, Thread, ThreadConstructor } from './types';

export * from './types';
export * from './generation';

export type * from './instrumentation';

type StoredContext = {
  currentThread: Thread | null;
  currentStep: Step | null;
};

const storage = new AsyncLocalStorage<StoredContext>();

export class LiteralClient {
  api: API;
  openai: ReturnType<typeof openai>;
  instrumentation: ReturnType<typeof instrumentation>;
  store: AsyncLocalStorage<StoredContext> = storage;

  constructor(apiKey?: string, apiUrl?: string, disabled?: boolean) {
    if (!apiKey) {
      apiKey = process.env.LITERAL_API_KEY;
    }

    if (!apiUrl) {
      apiUrl = process.env.LITERAL_API_URL || 'https://cloud.getliteral.ai';
    }

    this.api = new API(this, apiKey!, apiUrl!, disabled);
    this.openai = openai(this);
    this.instrumentation = instrumentation(this);
  }

  thread(data?: ThreadConstructor) {
    return new Thread(this, data);
  }

  step(data: StepConstructor) {
    return new Step(this, data);
  }

  run(data: Omit<StepConstructor, 'type'>) {
    return this.step({ ...data, type: 'run' });
  }

  /**
   * Gets the current thread from the context.
   * WARNING : this will throw if run outside of a thread context.
   * @returns The current thread, if any.
   */
  getCurrentThread(): Thread {
    const store = storage.getStore();

    if (!store?.currentThread) {
      throw new Error(
        'Literal AI SDK : tried to access current thread outside of a thread context.'
      );
    }

    return store.currentThread;
  }

  /**
   * Gets the current step from the context.
   * WARNING : this will throw if run outside of a step context.
   * @returns The current step, if any.
   */
  getCurrentStep(): Step {
    const store = storage.getStore();

    if (!store?.currentStep) {
      throw new Error(
        'Literal AI SDK : tried to access current step outside of a context.'
      );
    }

    return store.currentStep;
  }
}
