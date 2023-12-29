import { Maybe, OmitUtils, Utils } from './types';

export type GenerationMessageRole =
  | 'system'
  | 'assistant'
  | 'user'
  | 'function'
  | 'tool';

export type ILLMSettings = Record<string, string | string[] | number | boolean>;

export type GenerationType = 'COMPLETION' | 'CHAT';

export class GenerationMessage extends Utils {
  template?: Maybe<string>;
  formatted: Maybe<string>;
  templateFormat?: Maybe<string>;
  role: GenerationMessageRole = 'assistant';
  name?: Maybe<string>;
}

export class BaseGeneration extends Utils {
  provider?: Maybe<string>;
  inputs?: Maybe<Record<string, string>>;
  completion?: Maybe<string>;
  settings?: Maybe<ILLMSettings>;
  tokenCount?: Maybe<number>;
}

export class CompletionGeneration extends BaseGeneration {
  type?: GenerationType = 'COMPLETION';
  template?: Maybe<string>;
  formatted?: Maybe<string>;
  templateFormat?: Maybe<string>;

  constructor(data: OmitUtils<CompletionGeneration>) {
    super();
    this.type = 'COMPLETION';
    Object.assign(this, data);
  }
}

export class ChatGeneration extends BaseGeneration {
  type?: GenerationType = 'CHAT';
  messages?: Maybe<OmitUtils<GenerationMessage>>[] = [];

  constructor(data: OmitUtils<ChatGeneration>) {
    super();
    this.type = 'CHAT';
    Object.assign(this, data);
  }
}

export type Generation = CompletionGeneration | ChatGeneration;
