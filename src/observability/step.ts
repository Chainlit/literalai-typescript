import { v4 as uuidv4 } from 'uuid';

import { LiteralClient } from '..';
import { API } from '../api';
import { Score } from '../evaluation/score';
import {
  Environment,
  Maybe,
  OmitUtils,
  Utils,
  isPlainObject,
  omitLiteralAiMetadata
} from '../utils';
import { Attachment } from './attachment';
import { Generation } from './generation';

export type StepType =
  | 'assistant_message'
  | 'embedding'
  | 'llm'
  | 'rerank'
  | 'retrieval'
  | 'run'
  | 'system_message'
  | 'tool'
  | 'undefined'
  | 'user_message';

class StepFields extends Utils {
  name!: string;
  type!: StepType;
  threadId?: string;
  rootRunId?: Maybe<string>;
  createdAt?: Maybe<string>;
  startTime?: Maybe<string>;
  id?: Maybe<string>;
  environment?: Maybe<Environment>;
  error?: Maybe<string | Record<string, any>>;
  input?: Maybe<Record<string, any>>;
  output?: Maybe<Record<string, any>>;
  metadata?: Maybe<Record<string, any>>;
  tags?: Maybe<string[]>;
  parentId?: Maybe<string>;
  endTime?: Maybe<string>;
  generation?: Maybe<Generation>;
  scores?: Maybe<Score[]>;
  attachments?: Maybe<Attachment[]>;
}

export type StepConstructor = OmitUtils<StepFields>;

/**
 * Represents a step in a process or workflow, extending the fields and methods from StepFields.
 */
export class Step extends StepFields {
  api: API;
  client: LiteralClient;

  /**
   * Constructs a new Step instance.
   * @param api The API instance to be used for sending and managing steps.
   * @param data The initial data for the step, excluding utility properties.
   */
  constructor(
    client: LiteralClient,
    data: StepConstructor,
    ignoreContext?: true
  ) {
    super();
    this.api = client.api;
    this.client = client;

    Object.assign(this, data);
    this.enrichFromStore(ignoreContext);

    // Automatically generate an ID if not provided.
    if (!this.id) {
      this.id = uuidv4();
    }

    // Set the creation and start time to the current time if not provided.
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
    if (!this.startTime) {
      this.startTime = new Date().toISOString();
    }

    // If the step is a message, set the end time to the start time.
    if (this.isMessage()) {
      this.endTime = this.startTime;
    }
  }

  private enrichFromStore(ignoreContext?: true) {
    if (ignoreContext) {
      return;
    }

    const currentStore = this.client.store.getStore();

    if (currentStore) {
      if (currentStore.metadata) {
        this.metadata = omitLiteralAiMetadata({
          ...this.metadata,
          ...currentStore.metadata
        });
      }

      if (currentStore.tags) {
        this.tags = [...(this.tags ?? []), ...currentStore.tags];
      }

      if (currentStore.stepId && !this.id) {
        this.id = currentStore.stepId;
        currentStore.stepId = null;
      }
    }

    // Automatically assign parent thread & step & rootRun if there are any in the store.
    this.threadId = this.threadId ?? this.client._currentThread()?.id;
    this.parentId = this.parentId ?? this.client._currentStep()?.id;
    this.rootRunId = this.rootRunId ?? this.client._rootRun()?.id;
  }

  /**
   * Serializes the step instance, converting complex objects to strings as necessary.
   * @returns A serialized representation of the step.
   */
  serialize() {
    const serialized = super.serialize();

    // Convert error objects to JSON string if present.
    if (typeof serialized.error === 'object' && serialized.error !== null) {
      serialized.error = JSON.stringify(serialized.error);
    }
    return serialized;
  }

  /**
   * Determines if the step is a type of message.
   * @returns True if the step is a user, assistant, or system message.
   */
  isMessage() {
    return (
      this.type === 'user_message' ||
      this.type === 'assistant_message' ||
      this.type === 'system_message'
    );
  }

  /**
   * Creates a new step instance linked to the current step as a parent.
   * @param data The data for the new step, excluding the threadId which is inherited.
   * @returns A new Step instance.
   */
  step(data: Omit<StepConstructor, 'threadId'>) {
    return new Step(this.client, {
      ...data,
      threadId: this.threadId,
      parentId: this.id
    });
  }

  /**
   * Sends the step to the API, handling disabled state and setting the end time if not already set.
   * @returns The current Step instance after potentially sending to the API.
   */
  async send() {
    if (this.api.disabled) {
      return this;
    }
    if (!this.endTime) {
      this.endTime = new Date().toISOString();
    }
    await this.api.sendSteps([this]);
    return this;
  }

  /**
   * Sends the step to the API, handling disabled state and setting the end time if not already set.
   * @param cb The callback function to run within the context of the step.
   * @param updateStep Optional update function to modify the step after the callback.
   * @returns The output of the wrapped callback function.
   */
  async wrap<Output>(
    cb: (step: Step) => Output | Promise<Output>,
    updateStep?:
      | Partial<StepConstructor>
      | ((output: Output) => Partial<StepConstructor>)
      | ((output: Output) => Promise<Partial<StepConstructor>>)
  ) {
    const startTime = new Date();
    this.startTime = startTime.toISOString();
    const currentStore = this.client.store.getStore();

    const output = await this.client.store.run(
      {
        currentThread: currentStore?.currentThread ?? null,
        currentExperimentItemRunId:
          currentStore?.currentExperimentItemRunId ?? null,
        currentStep: this,
        rootRun: currentStore?.rootRun
          ? currentStore?.rootRun
          : this.type === 'run'
          ? this
          : null,
        metadata: currentStore?.metadata ?? null,
        tags: currentStore?.tags ?? null,
        stepId: currentStore?.stepId ?? null
      },
      () => cb(this)
    );

    this.output = isPlainObject(output) ? output : { output };
    this.endTime = new Date().toISOString();

    if (updateStep) {
      const updatedStep =
        typeof updateStep === 'function'
          ? await updateStep(output)
          : updateStep;

      this.name = updatedStep.name ?? this.name;
      this.type = updatedStep.type ?? this.type;
      this.threadId = updatedStep.threadId ?? this.threadId;
      this.createdAt = updatedStep.createdAt ?? this.createdAt;
      this.startTime = updatedStep.startTime ?? this.startTime;
      this.error = updatedStep.error ?? this.error;
      this.input = updatedStep.input ?? this.input;
      this.output = updatedStep.output ?? this.output;
      this.metadata = updatedStep.metadata ?? this.metadata;
      this.tags = updatedStep.tags ?? this.tags;
      this.parentId = updatedStep.parentId ?? this.parentId;
      this.endTime = updatedStep.endTime ?? this.endTime;
      this.generation = updatedStep.generation ?? this.generation;
      this.scores = updatedStep.scores ?? this.scores;
      this.attachments = updatedStep.attachments ?? this.attachments;
      this.environment = updatedStep.environment ?? this.environment;
      this.rootRunId = updatedStep.rootRunId ?? this.rootRunId;
    }

    this.send().catch(console.error);

    return output;
  }
}
