import { AsyncLocalStorage } from 'node:async_hooks';

import { API } from './api';
import instrumentation from './instrumentation';
import openai from './openai';
import {
  Maybe,
  Step,
  StepConstructor,
  Thread,
  ThreadConstructor
} from './types';

export * from './types';
export * from './generation';

export type * from './instrumentation';

type Store = {
  currentThread: Thread | null;
  currentStep: Step | null;
};

const storage = new AsyncLocalStorage<Store>();

export class LiteralClient {
  api: API;
  openai: ReturnType<typeof openai>;
  instrumentation: ReturnType<typeof instrumentation>;
  store: AsyncLocalStorage<Store> = storage;

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

  getCurrentThread(): Maybe<Thread> {
    return storage.getStore()?.currentThread ?? null;
  }

  getCurrentStep(): Maybe<Step> {
    return storage.getStore()?.currentStep ?? null;
  }
}
