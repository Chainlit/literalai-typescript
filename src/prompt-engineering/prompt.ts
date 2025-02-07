import mustache from 'mustache';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool
} from 'openai/resources';

import { API } from '../api';
import { DatasetItem } from '../evaluation/dataset';
import {
  GenerationType,
  IGenerationMessage
} from '../observability/generation';
import { Maybe, OmitUtils, Utils } from '../utils';

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
  deletedAt?: Maybe<string>;
  name!: string;
  version!: number;
  url?: Maybe<string>;
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

export interface IPromptRollout {
  version: number;
  rollout: number;
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
          }) as ChatCompletionMessageParam['content'];
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
    const {
      CustomChatPromptTemplate
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    } = require('../instrumentation/langchain');
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
