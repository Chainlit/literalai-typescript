import { AsyncLocalStorage } from 'node:async_hooks';

import { API } from './api';
import { ExperimentRun } from './evaluation/experiment-run';
import instrumentation from './instrumentation';
import openai from './instrumentation/openai-syncer';
import { Step, StepConstructor } from './observability/step';
import { Thread, ThreadConstructor } from './observability/thread';
import { Environment } from './utils';

export * from './utils';
export * from './observability/generation';

export type * from './instrumentation';

type StoredContext = {
  currentThread: Thread | null;
  currentStep: Step | null;
  currentExperimentRunId?: string | null;
};

const storage = new AsyncLocalStorage<StoredContext>();

export class LiteralClient {
  api: API;
  openai: ReturnType<typeof openai>;
  instrumentation: ReturnType<typeof instrumentation>;
  store: AsyncLocalStorage<StoredContext> = storage;

  /**
   * Initialize a new Literal AI Client.
   * @param options
   * @param options.apiKey The API key to use for the Literal AI API. Defaults to the LITERAL_API_KEY environment variable.
   * @param options.apiUrl The URL of the Literal AI API. Defaults to the LITERAL_API_URL environment variable.
   * @param options.environment The environment to use for the Literal AI API.
   * @param options.disabled If set to true, no call will be made to the Literal AI API.
   * @returns A new LiteralClient instance.
   */
  constructor({
    apiKey,
    apiUrl,
    environment,
    disabled
  }: {
    apiKey?: string;
    apiUrl?: string;
    environment?: Environment;
    disabled?: boolean;
  } = {}) {
    if (!apiKey) {
      apiKey = process.env.LITERAL_API_KEY;
    }

    if (!apiUrl) {
      apiUrl = process.env.LITERAL_API_URL || 'https://cloud.getliteral.ai';
    }

    this.api = new API(this, apiKey, apiUrl, environment, disabled);
    this.openai = openai(this);
    this.instrumentation = instrumentation(this);
  }

  /**
   * Creates a new thread without sending it to the Literal AI API.
   * @param data Optional initial data for the thread.
   * @returns A new thread instance.
   */
  thread(data?: ThreadConstructor) {
    return new Thread(this, data);
  }

  /**
   * Creates a new step without sending it to the Literal AI API.
   * @param data Optional initial data for the step.
   * @returns A new step instance.
   */
  step(data: StepConstructor) {
    return new Step(this, data);
  }

  /**
   * Creates a new step with the type set to 'run'.
   * @param data Optional initial data for the step.
   * @returns A new step instance.
   */
  run(data: Omit<StepConstructor, 'type'>) {
    return this.step({ ...data, type: 'run' });
  }

  /**
   * Creates a new Experiment Run.
   * @param data Optional initial data for the step.
   * @returns A new step instance.
   */
  experimentRun(data?: Omit<StepConstructor, 'type' | 'name'>) {
    return new ExperimentRun(this, {
      ...(data || {}),
      name: 'Experiment Run',
      type: 'run'
    });
  }

  /**
   * Returns the current thread from the context or null if none.
   * @returns The current thread, if any.
   */
  _currentThread(): Thread | null {
    const store = storage.getStore();

    return store?.currentThread || null;
  }

  /**
   * Returns the current step from the context or null if none.
   * @returns The current step, if any.
   */
  _currentStep(): Step | null {
    const store = storage.getStore();

    return store?.currentStep || null;
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
