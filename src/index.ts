import { AsyncLocalStorage } from 'node:async_hooks';

import { API } from './api';
import { ExperimentItemRun } from './evaluation/experiment-item-run';
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
  currentExperimentItemRunId?: string | null;
  rootRun: Step | null;
  metadata: Record<string, any> | null;
  tags: string[] | null;
  stepId: string | null;
};

/**
 * The LiteralClient class provides an interface to interact with the Literal AI API.
 * It offers methods for creating threads and steps, as well as instrumentation for various AI services.
 *
 * @example
 * ```typescript
 * const literalAiClient = new LiteralClient({
 *   apiKey: 'your-api-key',
 *   environment: 'production'
 * });
 *
 * const thread = literalAiClient.thread();
 * const step = literalAiClient.step({ name: 'Example Step', type: 'llm' });
 * ```
 */
export class LiteralClient {
  api: API;
  openai: ReturnType<typeof openai>;
  instrumentation: ReturnType<typeof instrumentation>;
  store: AsyncLocalStorage<StoredContext> =
    new AsyncLocalStorage<StoredContext>();

  /**
   * Initialize a new Literal AI Client.
   * @param options
   * @param options.apiKey The API key to use for the Literal AI API. Defaults to the LITERAL_API_KEY environment variable.
   * @param options.apiUrl The URL of the Literal AI API. Defaults to the LITERAL_API_URL env var, or https://cloud.getliteral.ai.
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

  experimentItemRun(data?: Omit<StepConstructor, 'type' | 'name'>) {
    return new ExperimentItemRun(this, {
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
    const store = this.store.getStore();

    return store?.currentThread || null;
  }

  /**
   * Returns the current step from the context or null if none.
   * @returns The current step, if any.
   */
  _currentStep(): Step | null {
    const store = this.store.getStore();

    return store?.currentStep || null;
  }

  /**
   * Returns the current experiment from the context or null if none.
   * @returns The current experiment, if any.
   */
  _currentExperimentItemRunId(): string | null {
    const store = this.store.getStore();

    return store?.currentExperimentItemRunId || null;
  }

  /**
   * Returns the root run from the context or null if none.
   * @returns The root run, if any.
   */
  _rootRun(): Step | null {
    const store = this.store.getStore();

    return store?.rootRun || null;
  }

  /**
   * Gets the current thread from the context.
   * WARNING : this will throw if run outside of a thread context.
   * @returns The current thread, if any.
   */
  getCurrentThread(): Thread {
    const store = this.store.getStore();

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
    const store = this.store.getStore();

    if (!store?.currentStep) {
      throw new Error(
        'Literal AI SDK : tried to access current step outside of a context.'
      );
    }

    return store.currentStep;
  }

  /**
   * Gets the current experiment run ID from the context.
   * WARNING : this will throw if run outside of an experiment context.
   * @returns The current experiment, if any.
   */
  getCurrentExperimentItemRunId(): string {
    const store = this.store.getStore();

    if (!store?.currentExperimentItemRunId) {
      throw new Error(
        'Literal AI SDK : tried to access current experiment outside of a context.'
      );
    }

    return store?.currentExperimentItemRunId;
  }

  /**
   * Gets the root run from the context.
   * WARNING : this will throw if run outside of a step context.
   * @returns The current step, if any.
   */
  getRootRun(): Step {
    const store = this.store.getStore();

    if (!store?.rootRun) {
      throw new Error(
        'Literal AI SDK : tried to access root run outside of a context.'
      );
    }

    return store.rootRun;
  }

  decorate(options: {
    metadata?: Record<string, any>;
    tags?: string[];
    stepId?: string;
  }) {
    return {
      wrap: async <T>(cb: () => T) => {
        const currentStore = this.store.getStore();

        return this.store.run(
          {
            currentThread: currentStore?.currentThread ?? null,
            currentExperimentItemRunId:
              currentStore?.currentExperimentItemRunId ?? null,
            currentStep: null,
            rootRun: null,
            metadata: options?.metadata ?? null,
            tags: options?.tags ?? null,
            stepId: options?.stepId ?? null
          },
          () => cb()
        );
      }
    };
  }
}
