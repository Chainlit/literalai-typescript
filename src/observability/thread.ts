import { v4 as uuidv4 } from 'uuid';

import { LiteralClient } from '..';
import { API } from '../api';
import { Environment, Maybe, OmitUtils, Utils } from '../utils';
import { Step, StepConstructor } from './step';

/**
 * Defines the structure for thread fields, inheriting utilities for serialization.
 * This class encapsulates common properties used to describe a thread in various environments.
 */
class ThreadFields extends Utils {
  id!: string;
  participantId?: Maybe<string>;
  environment?: Maybe<Environment>;
  name?: Maybe<string>;
  metadata?: Maybe<Record<string, any>>;
  steps?: Maybe<Step[]>;
  tags?: Maybe<string[]>;
}

/**
 * @ignore
 */
export type CleanThreadFields = OmitUtils<ThreadFields>;

/**
 * @ignore
 */
export type ThreadConstructor = Omit<CleanThreadFields, 'id' | 'steps'> &
  Partial<Pick<CleanThreadFields, 'id'>>;

/**
 * Represents a thread in the system, extending the properties and methods from `ThreadFields`.
 * This class manages thread-specific operations such as creation and updates via the API.
 */
export class Thread extends ThreadFields {
  api: API;
  client: LiteralClient;

  /**
   * Constructs a new Thread instance, with a generated ID if none is provided.
   * @param api - The API instance to interact with backend services.
   * @param data - Optional initial data for the thread.
   */
  constructor(client: LiteralClient, data?: ThreadConstructor) {
    super();
    this.api = client.api;
    this.client = client;

    if (!data) {
      data = { id: uuidv4() };
    } else if (!data.id) {
      data.id = uuidv4();
    }

    const currentStore = this.client.store.getStore();

    if (currentStore) {
      if (currentStore.metadata) {
        data.metadata = {
          ...data.metadata,
          ...currentStore.metadata
        };
      }
      if (currentStore.tags) {
        data.tags = [...(data.tags ?? []), ...currentStore.tags];
      }
    }

    Object.assign(this, data);
  }

  /**
   * Creates a new step associated with this thread.
   * @param data - The data for the new step, excluding the thread ID.
   * @returns A new Step instance linked to this thread.
   */
  step(data: Omit<StepConstructor, 'threadId'>) {
    return new Step(this.client, {
      ...data,
      threadId: this.id
    });
  }

  /**
   * Creates a new Run step associated with this thread.
   * @param data - The data for the new step, excluding the thread ID and the type
   * @returns A new Step instance linked to this thread.
   */
  run(data: Omit<StepConstructor, 'threadId' | 'type'>) {
    return this.step({ ...data, type: 'run' });
  }

  /**
   * Upserts the thread data to the backend, creating or updating as necessary.
   * @returns The updated Thread instance.
   */
  async upsert() {
    if (this.api.disabled) {
      return this;
    }
    await this.api.upsertThread({
      threadId: this.id,
      name: this.name,
      metadata: this.metadata,
      participantId: this.participantId,
      tags: this.tags
    });
    return this;
  }

  /**
   * Sends the thread to the API, handling disabled state and setting the end time if not already set.
   * @param cb The callback function to run within the context of the thread.
   * @param updateThread Optional update function to modify the thread after the callback.
   * @returns The output of the wrapped callback function.
   */
  async wrap<Output>(
    cb: (thread: Thread) => Output | Promise<Output>,
    updateThread?:
      | ThreadConstructor
      | ((output: Output) => ThreadConstructor)
      | ((output: Output) => Promise<ThreadConstructor>)
  ) {
    const currentStore = this.client.store.getStore();

    const output = await this.client.store.run(
      {
        currentThread: this,
        currentExperimentItemRunId:
          currentStore?.currentExperimentItemRunId ?? null,
        currentStep: null,
        rootRun: null,
        metadata: currentStore?.metadata ?? null,
        tags: currentStore?.tags ?? null,
        stepId: currentStore?.stepId ?? null
      },
      () => cb(this)
    );

    if (updateThread) {
      const updatedThread =
        typeof updateThread === 'function'
          ? await updateThread(output)
          : updateThread;

      this.participantId = updatedThread.participantId ?? this.participantId;
      this.environment = updatedThread.environment ?? this.environment;
      this.name = updatedThread.name ?? this.name;
      this.metadata = updatedThread.metadata ?? this.metadata;
      this.tags = updatedThread.tags ?? this.tags;
    }

    this.upsert().catch(console.error);

    return output;
  }
}
