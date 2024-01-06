import { v4 as uuidv4 } from 'uuid';

import { API } from './api';
import { Generation } from './generation';

export type Maybe<T> = T | null | undefined;

export type OmitUtils<T> = Omit<T, keyof Utils>;

export class Utils {
  serialize(): any {
    const dict: any = {};
    Object.keys(this as any).forEach((key) => {
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

export type FeedbackStrategy =
  | 'BINARY'
  | 'STARS'
  | 'BIG_STARS'
  | 'LIKERT'
  | 'CONTINUOUS'
  | 'LETTERS'
  | 'PERCENTAGE';

export class Feedback extends Utils {
  id: Maybe<string>;
  threadId: Maybe<string>;
  stepId: Maybe<string>;
  value: Maybe<number>;
  strategy: FeedbackStrategy = 'BINARY';
  comment: Maybe<string>;

  constructor(data: OmitUtils<Feedback>) {
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
  metadata?: Maybe<Record<string, any>>;
  tags?: Maybe<string[]>;
}

export type ThreadConstructor = OmitUtils<ThreadFields>;

export class Thread extends ThreadFields {
  api: API;
  constructor(api: API, data: ThreadConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
  }

  step(data: Omit<StepConstructor, 'threadId'>) {
    return new Step(this.api, {
      ...data,
      threadId: this.id
    });
  }

  async upsert() {
    await this.api.upsertThread(
      this.id,
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
  threadId!: string;
  createdAt?: Maybe<string>;
  startTime?: Maybe<string>;
  id?: Maybe<string>;
  input?: Maybe<string>;
  output?: Maybe<string>;
  metadata?: Maybe<Record<string, any>>;
  tags?: Maybe<string[]>;
  parentId?: Maybe<string>;
  endTime?: Maybe<string>;
  generation?: Maybe<Generation>;
  feedback?: Maybe<Feedback>;
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

  isMessage() {
    return (
      this.type === 'user_message' ||
      this.type === 'assistant_message' ||
      this.type === 'system_message'
    );
  }

  childStep(data: Omit<StepConstructor, 'threadId'>) {
    return new Step(this.api, {
      ...data,
      threadId: this.threadId,
      parentId: this.id
    });
  }

  async send() {
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

export type ParticipantSessionConstructor = OmitUtils<ParticipantSession>;

export class ParticipantSession extends Utils {
  api: API;

  id?: Maybe<string>;
  startedAt?: Maybe<string>;
  endedAt?: Maybe<string>;
  metadata?: Maybe<Record<string, any>>;
  projectId?: Maybe<string>;
  isInteractive?: Maybe<boolean>;
  anonParticipantIdentifier?: Maybe<string>;
  participantIdentifier?: Maybe<string>;

  serviceVersion?: Maybe<string>;

  constructor(api: API, data: ParticipantSessionConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.startedAt) {
      this.startedAt = new Date().toISOString();
    }
  }
}
