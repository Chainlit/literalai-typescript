import mustache from 'mustache';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool
} from 'openai/resources';
import { v4 as uuidv4 } from 'uuid';

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

export class Utils {
  serialize(): any {
    const dict: any = {};
    Object.keys(this as any).forEach((key) => {
      if (key === 'api') {
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

export class Score extends Utils {
  id?: Maybe<string>;
  stepId?: Maybe<string>;
  generationId?: Maybe<string>;
  datasetExperimentItemId?: Maybe<string>;
  name: string = 'user-feedback';
  value: number = 0;
  type: ScoreType = 'AI';
  comment?: Maybe<string>;
  tags?: Maybe<string[]>;

  constructor(data: OmitUtils<Score>) {
    super();
    Object.assign(this, data);
  }
}

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

export class Thread extends ThreadFields {
  api: API;
  constructor(api: API, data?: ThreadConstructor) {
    super();
    this.api = api;
    if (!data) {
      data = { id: uuidv4() };
    } else if (!data.id) {
      data.id = uuidv4();
    }
    Object.assign(this, data);
  }

  step(data: Omit<StepConstructor, 'threadId'>) {
    return new Step(this.api, {
      ...data,
      threadId: this.id
    });
  }

  async upsert() {
    if (this.api.disabled) {
      return this;
    }
    await this.api.upsertThread(
      this.id,
      this.name,
      this.metadata,
      this.participantId,
      this.environment,
      this.tags
    );
    return this;
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

export class Step extends StepFields {
  api: API;
  constructor(api: API, data: StepConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
    if (!this.startTime) {
      this.startTime = new Date().toISOString();
    }
    if (this.isMessage()) {
      this.endTime = this.startTime;
    }
  }

  serialize() {
    const serialized = super.serialize();

    if (typeof serialized.error === 'object' && serialized.error !== null) {
      serialized.error = JSON.stringify(serialized.error);
    }
    return serialized;
  }

  isMessage() {
    return (
      this.type === 'user_message' ||
      this.type === 'assistant_message' ||
      this.type === 'system_message'
    );
  }

  step(data: Omit<StepConstructor, 'threadId'>) {
    return new Step(this.api, {
      ...data,
      threadId: this.threadId,
      parentId: this.id
    });
  }

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
}

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

  async delete() {
    return this.api.deleteDataset(this.id);
  }

  async createItem(datasetItem: {
    input: Record<string, any>;
    expectedOutput?: Maybe<Record<string, any>>;
    metadata?: Maybe<Record<string, any>>;
  }) {
    const item = await this.api.createDatasetItem(this.id, datasetItem);

    this.items.push(item);
    return item;
  }

  async deleteItem(id: string) {
    const deletedItem = await this.api.deleteDatasetItem(id);
    if (this.items) {
      this.items = this.items.filter((item) => item.id !== id);
    }
    return deletedItem;
  }

  async createExperiment(experiment: {
    name: string;
    assertions?: Record<string, any> | Array<Record<string, any>>;
  }) {
    const datasetExperiment = await this.api.createDatasetExperiment({
      name: experiment.name,
      datasetId: this.id,
      assertions: experiment.assertions
    });
    return new DatasetExperiment(this.api, datasetExperiment);
  }

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

export class DatasetExperiment extends Utils {
  id!: string;
  createdAt!: string;
  name!: string;
  datasetId!: string;
  api: API;
  assertions!: Record<string, any> | Array<Record<string, any>>;
  items!: DatasetExperimentItem[];

  constructor(api: API, data: OmitUtils<DatasetExperiment>) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.items) {
      this.items = [];
    }
  }

  async log(datasetExperimentItem: DatasetExperimentItem) {
    if (datasetExperimentItem.datasetExperimentId != this.id) {
      throw new Error(
        `Cannot log experiment item with experiment ${datasetExperimentItem.datasetExperimentId} onto experiment ${this.id}.`
      );
    }

    // TODO: How to check that this.datasetId === datasetExperimentItem.datasetItemId.parentDatasetId
    const item = await this.api.createDatasetExperimentItem(
      datasetExperimentItem
    );

    this.items.push(item);
    return item;
  }
}
export class DatasetExperimentItem extends Utils {
  id?: string;
  datasetExperimentId!: string;
  datasetItemId!: string;
  scores!: Score[];

  constructor(data: OmitUtils<DatasetExperimentItem>) {
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

  constructor(api: API, data: PromptConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (this.tools?.length === 0) {
      this.tools = undefined;
    }
  }

  format(variables?: Record<string, any>): ChatCompletionMessageParam[] {
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
