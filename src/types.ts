import mustache from 'mustache';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool
} from 'openai/resources';
import { v4 as uuidv4 } from 'uuid';

import { LiteralClient } from '.';
import { API } from './api';
import { Generation, GenerationType, IGenerationMessage } from './generation';
import { CustomChatPromptTemplate } from './instrumentation/langchain';

export type Maybe<T> = T | null | undefined;

export type OmitUtils<T> = Omit<T, keyof Utils>;

export type PageInfo = {
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pageInfo: PageInfo;
};

function getClassMethods(constructor: { new (...args: any[]): object }) {
  return Reflect.ownKeys(constructor.prototype)
    .filter((key) => key !== 'constructor')
    .map((key) => ({
      key,
      descriptor: Object.getOwnPropertyDescriptor(constructor.prototype, key)
    }))
    .filter(({ descriptor }) => {
      return descriptor && typeof descriptor.value === 'function';
    });
}

/**
 * Represents a utility class with serialization capabilities.
 */
export class Utils {
  /**
   * Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
   * It handles nested objects that also implement a serialize method.
   *
   * @returns A dictionary representing the serialized properties of the object.
   */
  serialize(): any {
    const dict: any = {};
    Object.keys(this as any).forEach((key) => {
      if (['api', 'client'].includes(key)) {
        return;
      }
      if ((this as any)[key] !== undefined) {
        if (Array.isArray((this as any)[key])) {
          dict[key] = (this as any)[key].map((item: any) => {
            if (
              item instanceof Object &&
              typeof item.serialize === 'function'
            ) {
              return item.serialize();
            } else {
              return item;
            }
          });
        } else if (
          (this as any)[key] instanceof Object &&
          typeof (this as any)[key].serialize === 'function'
        ) {
          dict[key] = (this as any)[key].serialize();
        } else {
          dict[key] = (this as any)[key];
        }
      }
    });
    return dict;
  }
}

export type ScoreType = 'HUMAN' | 'AI';

/**
 * Represents a score entity with properties to track various aspects of scoring.
 * It extends the `Utils` class for serialization capabilities.
 */
export class Score extends Utils {
  id?: Maybe<string>;
  stepId?: Maybe<string>;
  generationId?: Maybe<string>;
  datasetExperimentItemId?: Maybe<string>;
  name: string = 'user-feedback';
  value: number = 0;
  type: ScoreType = 'AI';
  scorer?: Maybe<string>;
  comment?: Maybe<string>;
  tags?: Maybe<string[]>;

  constructor(data: OmitUtils<Score>) {
    super();
    Object.assign(this, data);
  }
}

/**
 * Represents an attachment with optional metadata, MIME type, and other properties.
 * It extends the `Utils` class for serialization capabilities.
 */
export class Attachment extends Utils {
  id?: Maybe<string>;
  metadata?: Maybe<Record<string, any>>;
  mime?: Maybe<string>;
  name: Maybe<string>;
  objectKey?: Maybe<string>;
  url?: Maybe<string>;

  constructor(data: OmitUtils<Attachment>) {
    super();
    Object.assign(this, data);
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

/**
 * Defines the structure for thread fields, inheriting utilities for serialization.
 * This class encapsulates common properties used to describe a thread in various environments.
 */
class ThreadFields extends Utils {
  id!: string;
  participantId?: Maybe<string>;
  environment?: Maybe<string>;
  name?: Maybe<string>;
  metadata?: Maybe<Record<string, any>>;
  steps?: Maybe<Step[]>;
  tags?: Maybe<string[]>;
}

export type CleanThreadFields = OmitUtils<ThreadFields>;
export type ThreadConstructor = Omit<CleanThreadFields, 'id'> &
  Partial<Pick<CleanThreadFields, 'id'>>;

/**
 * Represents a thread in the system, extending the properties and methods from `ThreadFields`.
 * This class manages thread-specific operations such as creation and updates via the API.
 */
export class Thread extends ThreadFields {
  api: API;
  client: LiteralClient;

  /**
   * Constructs a new Thread instance.
   * @param api - The API instance to interact with backend services.
   * @param data - Optional initial data for the thread, with an auto-generated ID if not provided.
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
      environment: this.environment,
      tags: this.tags
    });
    return this;
  }

  async wrap<Output>(
    cb: (thread: Thread) => Output | Promise<Output>,
    updateThread?:
      | ThreadConstructor
      | ((output: Output) => ThreadConstructor)
      | ((output: Output) => Promise<ThreadConstructor>)
  ) {
    const output = await this.client.store.run(
      { currentThread: this, currentStep: null },
      () => cb(this)
    );

    if (updateThread) {
      const updatedThread =
        typeof updateThread === 'function'
          ? await updateThread(output)
          : updateThread;
      Object.assign(this, updatedThread);
    }

    await this.upsert();

    return output;
  }

  enter() {
    this.client.store.enterWith({ currentThread: this, currentStep: null });

    return this;
  }

  decorateClass<Class extends { new (...args: any[]): object }>(
    constructor: Class,
    ..._args: unknown[]
  ) {
    /* eslint-disable-next-line @typescript-eslint/no-this-alias*/
    const thread = this;
    const store = this.client.store;

    const classMethodDescriptors = getClassMethods(constructor);

    store.enterWith({ currentThread: thread, currentStep: null });

    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);

        store.enterWith({ currentThread: thread, currentStep: null });

        thread.upsert();

        // Here we wrap every method of the class to ensure that the thread is updated after each method call.
        classMethodDescriptors.forEach(({ key, descriptor }) => {
          if (!descriptor) {
            return;
          }

          Object.defineProperty(this, key, {
            ...descriptor,
            value: (...methodArgs: unknown[]) => {
              const result = descriptor.value.apply(this, methodArgs);

              if (result instanceof Promise) {
                return result.then(async (output) => {
                  await thread.upsert();
                  return output;
                });
              } else {
                thread.upsert();
                return result;
              }
            }
          });
        });
      }
    };
  }
}

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
  createdAt?: Maybe<string>;
  startTime?: Maybe<string>;
  id?: Maybe<string>;
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

    // Automatically generate an ID if not provided.
    if (!this.id) {
      this.id = uuidv4();
    }

    if (ignoreContext) {
      return;
    }

    // Automatically assign parent thread & step if there are any in the store.
    const store = this.client.store.getStore();

    if (store?.currentThread) {
      this.threadId = store.currentThread.id;
    }
    if (store?.currentStep) {
      this.parentId = store.currentStep.id;
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
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (!this.endTime) {
      this.endTime = new Date().toISOString();
    }
    await this.api.sendSteps([this]);
    return this;
  }

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
      { currentThread: currentStore?.currentThread ?? null, currentStep: this },
      () => cb(this)
    );

    this.output = { output };
    this.endTime = new Date().toISOString();

    if (updateStep) {
      const updatedStep =
        typeof updateStep === 'function'
          ? await updateStep(output)
          : updateStep;
      Object.assign(this, updatedStep);
    }

    await this.send();

    return output;
  }

  enter() {
    const currentStore = this.client.store.getStore();

    this.client.store.enterWith({
      currentThread: currentStore?.currentThread ?? null,
      currentStep: this
    });
  }

  decorateMethod<Class, Args extends any[], Result>(
    originalMethod: (this: Class, ...args: Args) => Promise<Result>,
    _context: any
  ) {
    /* eslint-disable-next-line @typescript-eslint/no-this-alias*/
    const step = this;

    return async function (this: Class, ...args: Args): Promise<Result> {
      const startTime = new Date();
      step.startTime = startTime.toISOString();
      const currentStore = step.client.store.getStore();

      const output = await step.client.store.run(
        {
          currentThread: currentStore?.currentThread ?? null,
          currentStep: step
        },
        () => originalMethod.apply(this, args)
      );

      step.output = { output };
      step.endTime = new Date().toISOString();

      await step.send();

      return output;
    };
  }

  decorateClass<Class extends { new (...args: any[]): object }>(
    constructor: Class,
    ..._args: unknown[]
  ) {
    /* eslint-disable-next-line @typescript-eslint/no-this-alias*/
    const step = this;
    const store = this.client.store;

    const classMethodDescriptors = getClassMethods(constructor);

    store.enterWith({
      currentThread: store.getStore()?.currentThread ?? null,
      currentStep: null
    });

    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);

        store.enterWith({
          currentThread: store.getStore()?.currentThread ?? null,
          currentStep: step
        });

        // Here we wrap every method of the class to ensure that the step is updated after each method call.
        classMethodDescriptors.forEach(({ key, descriptor }) => {
          if (!descriptor) {
            return;
          }

          Object.defineProperty(this, key, {
            ...descriptor,
            value: (...methodArgs: unknown[]) => {
              const startTime = new Date();
              step.startTime = startTime.toISOString();

              const result = descriptor.value.apply(this, methodArgs);

              if (result instanceof Promise) {
                return result.then(async (output) => {
                  step.output = { output };
                  step.endTime = new Date().toISOString();

                  await step.send();

                  return output;
                });
              } else {
                step.output = { output: result };
                step.endTime = new Date().toISOString();
                step.send();

                return result;
              }
            }
          });
        });

        step.send();
      }
    };
  }
}

/**
 * Represents a user with optional metadata and identifier.
 */
export class User extends Utils {
  id?: Maybe<string>;
  identifier!: string;
  metadata?: Maybe<Record<string, any>>;

  constructor(data: OmitUtils<User>) {
    super();
    Object.assign(this, data);
  }
}

export type DatasetType = 'key_value' | 'generation';

class DatasetFields extends Utils {
  id!: string;
  createdAt!: string;
  name?: Maybe<string>;
  description?: Maybe<string>;
  metadata!: Record<string, any>;
  items!: Array<OmitUtils<DatasetItem>>;
  type?: DatasetType;
}

export type DatasetConstructor = OmitUtils<DatasetFields>;

export class Dataset extends DatasetFields {
  api: API;

  /**
   * Constructs a new Dataset instance.
   * @param api - The API instance to interact with backend services.
   * @param data - The initial data for the dataset.
   */
  constructor(api: API, data: DatasetConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.items) {
      this.items = [];
    }
    if (!this.type) {
      this.type = 'key_value';
    }
  }

  /**
   * Updates the dataset with new data.
   * @param dataset - The dataset data to update.
   * @returns The updated dataset instance.
   */
  async update(dataset: {
    name?: Maybe<string>;
    description?: Maybe<string>;
    metadata?: Maybe<Record<string, any>>;
  }) {
    const update_res = await this.api.updateDataset(this.id, dataset);
    this.name = update_res.name;
    this.description = update_res.description;
    this.metadata = update_res.metadata;
  }

  /**
   * Deletes the dataset.
   * @returns A promise that resolves when the dataset is deleted.
   */
  async delete() {
    return this.api.deleteDataset(this.id);
  }

  /**
   * Creates a new item in the dataset.
   * @param datasetItem - The new item to be added to the dataset.
   * @returns The newly created dataset item.
   */
  async createItem(datasetItem: {
    input: Record<string, any>;
    expectedOutput?: Maybe<Record<string, any>>;
    metadata?: Maybe<Record<string, any>>;
  }) {
    const item = await this.api.createDatasetItem(this.id, datasetItem);

    this.items.push(item);
    return item;
  }

  /**
   * Deletes an item from the dataset.
   * @param id - The ID of the item to delete.
   * @returns The deleted dataset item.
   */
  async deleteItem(id: string) {
    const deletedItem = await this.api.deleteDatasetItem(id);
    if (this.items) {
      this.items = this.items.filter((item) => item.id !== id);
    }
    return deletedItem;
  }

  /**
   * Creates a new experiment associated with the dataset.
   * @param experiment - The experiment details including name, optional prompt ID, and parameters.
   * @returns A new instance of DatasetExperiment containing the created experiment.
   */
  async createExperiment(experiment: {
    name: string;
    promptId?: string;
    params?: Record<string, any> | Array<Record<string, any>>;
  }) {
    const datasetExperiment = await this.api.createExperiment({
      name: experiment.name,
      datasetId: this.id,
      promptId: experiment.promptId,
      params: experiment.params
    });
    return new DatasetExperiment(this.api, datasetExperiment);
  }

  /**
   * Adds a step to the dataset.
   * @param stepId - The ID of the step to add.
   * @param metadata - Optional metadata for the step.
   * @returns The added dataset item.
   * @throws Error if the dataset type is 'generation'.
   */
  public async addStep(
    stepId: string,
    metadata?: Maybe<Record<string, unknown>>
  ) {
    if (this.type === 'generation') {
      throw new Error('Cannot add steps to a generation dataset');
    }
    const item = await this.api.addStepToDataset(this.id, stepId, metadata);
    this.items.push(item);
    return item;
  }

  /**
   * Adds a generation to the dataset.
   * @param generationId - The ID of the generation to add.
   * @param metadata - Optional metadata for the generation.
   * @returns The added dataset item.
   */
  public async addGeneration(
    generationId: string,
    metadata?: Maybe<Record<string, unknown>>
  ) {
    const item = await this.api.addGenerationToDataset(
      this.id,
      generationId,
      metadata
    );
    this.items.push(item);
    return item;
  }

  public async addGenerations(generationIds?: string[]) {
    if (generationIds == undefined || generationIds?.length === 0) {
      return [];
    }

    const items = await this.api.addGenerationsToDataset(
      this.id,
      generationIds
    );
    this.items = this.items.concat(items);
    return items;
  }
}

export class DatasetItem extends Utils {
  id!: string;
  createdAt!: string;
  datasetId!: string;
  metadata!: Record<string, any>;
  input!: Record<string, any>;
  expectedOutput?: Maybe<Record<string, any>>;
  intermediarySteps!: Array<Record<string, any>>;

  constructor(data: OmitUtils<DatasetItem>) {
    super();
    Object.assign(this, data);
  }
}

class DatasetExperimentItemFields extends Utils {
  id?: string;
  datasetExperimentId!: string;
  datasetItemId!: string;
  scores!: Score[];
  input?: Record<string, any>;
  output?: Record<string, any>;
}

export class DatasetExperiment extends Utils {
  id!: string;
  createdAt!: string;
  name!: string;
  datasetId!: string;
  promptId?: string;
  api: API;
  params!: Record<string, any> | Array<Record<string, any>>;
  items!: DatasetExperimentItem[];

  constructor(api: API, data: OmitUtils<DatasetExperiment>) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.items) {
      this.items = [];
    }
  }

  async log(
    itemFields: Omit<
      OmitUtils<DatasetExperimentItemFields>,
      'id' | 'datasetExperimentId'
    >
  ) {
    const datasetExperimentItem = new DatasetExperimentItem({
      ...itemFields,
      datasetExperimentId: this.id
    });

    const item = await this.api.createExperimentItem(datasetExperimentItem);

    this.items.push(item);
    return item;
  }
}

export type DatasetExperimentItemConstructor =
  OmitUtils<DatasetExperimentItemFields>;

export class DatasetExperimentItem extends DatasetExperimentItemFields {
  constructor(data: DatasetExperimentItemConstructor) {
    super();
    Object.assign(this, data);
  }
}
export interface IPromptVariableDefinition {
  name: string;
  language: 'json' | 'plaintext';
}

export interface IProviderSettings {
  provider: string;
  model: string;
  frequency_penalty: number;
  max_tokens: number;
  presence_penalty: number;
  stop?: string[];
  temperature: number;
  top_p: number;
}

class PromptFields extends Utils {
  id!: string;
  type!: GenerationType;
  createdAt!: string;
  name!: string;
  version!: number;
  versionDesc?: Maybe<string>;
  metadata!: Record<string, any>;
  items!: Array<OmitUtils<DatasetItem>>;
  variablesDefaultValues?: Maybe<Record<string, any>>;
  templateMessages!: IGenerationMessage[];
  tools?: ChatCompletionTool[];
  provider!: string;
  settings!: IProviderSettings;
  variables!: IPromptVariableDefinition[];
}

export type PromptConstructor = OmitUtils<PromptFields>;

export class Prompt extends PromptFields {
  api: API;

  /**
   * Constructs a new Prompt instance.
   * @param api - The API instance to interact with backend services.
   * @param data - The initial data for the prompt.
   */
  constructor(api: API, data: PromptConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (this.tools?.length === 0) {
      this.tools = undefined;
    }
  }

  /**
   * Formats the prompt's template messages with the given variables.
   * @param variables - Optional variables to resolve in the template messages.
   * @returns An array of formatted chat completion messages.
   */
  formatMessages(
    variables?: Record<string, any>
  ): ChatCompletionMessageParam[] {
    const variablesWithDefault = {
      ...(this.variablesDefaultValues || {}),
      ...variables
    };

    const promptId = this.id;

    return this.templateMessages.map(
      ({ uuid, templated, ...templateMessage }) => {
        const formattedMessage = {
          ...templateMessage
        } as ChatCompletionMessageParam;
        // @ts-expect-error Hacky way to add metadata to the formatted message
        formattedMessage.literalMetadata = () => {
          return {
            uuid: uuid,
            promptId,
            variables: variablesWithDefault
          };
        };
        if (Array.isArray(formattedMessage.content)) {
          formattedMessage.content = formattedMessage.content.map((content) => {
            if (content.type === 'text') {
              return {
                ...content,
                text: mustache.render(content.text, variablesWithDefault)
              };
            }
            return content;
          });
        } else if (typeof formattedMessage.content === 'string') {
          formattedMessage.content = mustache.render(
            formattedMessage.content,
            variablesWithDefault
          );
        }

        return formattedMessage;
      }
    );
  }

  /**
   * @deprecated Please use `formatMessages` instead.
   */
  format(variables?: Record<string, any>): ChatCompletionMessageParam[] {
    return this.formatMessages(variables);
  }

  /**
   * Converts the prompt's template messages into a Langchain chat prompt template.
   * @returns A custom chat prompt template configured with the prompt's data.
   */
  toLangchainChatPromptTemplate() {
    const lcMessages: [string, string][] = this.templateMessages.map((m) => [
      m.role,
      m.content as string
    ]);
    const chatTemplate = CustomChatPromptTemplate.fromMessages(lcMessages);
    chatTemplate.variablesDefaultValues = this.variablesDefaultValues;
    chatTemplate.literalTemplateMessages = this.templateMessages;
    chatTemplate.promptId = this.id;

    return chatTemplate;
  }
}
