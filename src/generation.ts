import { Maybe, OmitUtils, Utils } from './types';

export type GenerationMessageRole =
  | 'system'
  | 'assistant'
  | 'user'
  | 'function'
  | 'tool';

export type ILLMSettings = Record<string, string | string[] | number | boolean>;

export interface ITextContent {
  type: 'text';
  text: string;
}

export interface IImageUrlContent {
  type: 'image_url';
  image_url: string;
}

export interface IGenerationMessage {
  content: string | [ITextContent | IImageUrlContent];
  role: GenerationMessageRole;
  name?: string;
  function_call?: Record<string, any>;
  tool_calls?: Record<string, any>[];
}

export type GenerationType = 'COMPLETION' | 'CHAT';

export interface IFunction {
  name: string;
  description: string;
  parameters: {
    required: string[];
    properties: Record<string, { title: string; type: string }>;
  };
}

export interface ITool {
  type: string;
  function: IFunction;
}

export class BaseGeneration extends Utils {
  provider?: Maybe<string>;
  model?: Maybe<string>;
  id?: Maybe<string>;
  tags?: Maybe<string[]>;
  error?: Maybe<string>;
  variables?: Maybe<Record<string, string>>;
  settings?: Maybe<ILLMSettings>;
  tools?: Maybe<ITool[]>;
  tokenCount?: Maybe<number>;
  inputTokenCount?: Maybe<number>;
  outputTokenCount?: Maybe<number>;
  ttFirstToken?: Maybe<number>;
  tokenThroughputInSeconds?: Maybe<number>;
  duration?: Maybe<number>;
}

export class CompletionGeneration extends BaseGeneration {
  type?: GenerationType = 'COMPLETION';
  prompt?: Maybe<string>;
  completion?: Maybe<string>;

  constructor(data: OmitUtils<CompletionGeneration>) {
    super();
    this.type = 'COMPLETION';
    Object.assign(this, data);
  }
}

export class ChatGeneration extends BaseGeneration {
  type?: GenerationType = 'CHAT';
  messages?: Maybe<IGenerationMessage[]> = [];
  messageCompletion?: Maybe<IGenerationMessage>;

  constructor(data: OmitUtils<ChatGeneration>) {
    super();
    this.type = 'CHAT';
    Object.assign(this, data);
  }
}

export type Generation = CompletionGeneration | ChatGeneration;
