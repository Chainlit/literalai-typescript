/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import {
  HandleLLMNewTokenCallbackFields,
  NewTokenIndices
} from '@langchain/core/callbacks/base';
import { DocumentInterface } from '@langchain/core/documents';
import { Serialized } from '@langchain/core/load/serializable';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage
} from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import {
  AIMessagePromptTemplate,
  BaseMessagePromptTemplateLike,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  TypedPromptInputValues
} from '@langchain/core/prompts';
import { ChainValues, InputValues } from '@langchain/core/utils/types';
import mustache from 'mustache';

import {
  ChatGeneration,
  CompletionGeneration,
  IGenerationMessage,
  ITool,
  LiteralClient
} from '..';
import { Step } from '../types';

// @ts-expect-error Generics
export class CustomChatPromptTemplate extends ChatPromptTemplate {
  public literalTemplateMessages?: IGenerationMessage[] | null;
  public variablesDefaultValues?: Record<string, any> | null;
  public promptId?: string | null;

  static fromMessages(
    promptMessages: (
      | ChatPromptTemplate<InputValues, string>
      | BaseMessagePromptTemplateLike
    )[]
  ): CustomChatPromptTemplate {
    const chatTemplate = ChatPromptTemplate.fromMessages(promptMessages);

    return new CustomChatPromptTemplate({
      inputVariables: chatTemplate.inputVariables,
      promptMessages: chatTemplate.promptMessages,
      partialVariables: chatTemplate.partialVariables
    });
  }

  async formatMessages(
    values: TypedPromptInputValues<any>
  ): Promise<BaseMessage[]> {
    const variables = { ...(this.variablesDefaultValues || {}), ...values };

    if (!this.literalTemplateMessages) return [];

    return this.promptMessages.map((message, i) => {
      //@ts-expect-error Check if message is a prompt template
      const content = mustache.render(message.prompt.template, variables);
      let additonalKwargs = {};
      if (
        this.literalTemplateMessages &&
        i < this.literalTemplateMessages.length
      ) {
        additonalKwargs = {
          uuid: this.literalTemplateMessages[i].uuid,
          promptId: this.promptId,
          variables
        };
      }

      if (message instanceof HumanMessagePromptTemplate) {
        return new HumanMessage(content, additonalKwargs);
      } else if (message instanceof AIMessagePromptTemplate) {
        return new AIMessage(content, additonalKwargs);
      } else {
        return new SystemMessage(content, additonalKwargs);
      }
    });
  }
}

interface ChatGenerationStart {
  promptId?: string;
  variables?: Record<string, any>;
  provider: string;
  model: string;
  settings: Record<string, any>;
  tools: ITool[];
  inputMessages: IGenerationMessage[];
  start: number;
  outputTokenCount: number;
  ttFirstToken?: number;
}

interface CompletionGenerationStart {
  provider: string;
  model: string;
  settings: Record<string, any>;
  prompt: string;
  start: number;
  outputTokenCount: number;
  ttFirstToken?: number;
}

function convertMessageRole(role: string) {
  if (role.toLowerCase().includes('human')) {
    return 'user';
  } else if (role.toLowerCase().includes('system')) {
    return 'system';
  } else if (role.toLowerCase().includes('function')) {
    return 'function';
  } else if (role.toLowerCase().includes('tool')) {
    return 'tool';
  } else {
    return 'assistant';
  }
}

function checkForLiteralPrompt(messages: BaseMessage[]) {
  let promptId: string | undefined;
  let variables: Record<string, any> | undefined;

  for (const message of messages) {
    if (message.additional_kwargs.promptId) {
      promptId = message.additional_kwargs.promptId as string;
    }
    if (message.additional_kwargs.variables) {
      variables = message.additional_kwargs.variables as Record<string, any>;
    }
  }

  return { promptId, variables };
}

function convertMessage(message: BaseMessage): IGenerationMessage {
  const uuid = message.additional_kwargs.uuid as string | undefined;
  return {
    name: message.name,
    role: convertMessageRole(message._getType()),
    content: message.content as any,
    function_call: message.additional_kwargs.function_call,
    uuid: uuid,
    templated: !!uuid
  };
}

export class LiteralCallbackHandler extends BaseCallbackHandler {
  name = 'literal_handler';
  runFlag = false;
  steps: Record<string, Step> = {};
  completionGenerations: Record<string, CompletionGenerationStart> = {};
  chatGenerations: Record<string, ChatGenerationStart> = {};
  parentIdMap: Record<string, string> = {};

  client: LiteralClient;
  threadId?: string;

  constructor(client: LiteralClient, threadId?: string) {
    super();
    this.client = client;
    this.threadId = threadId;
  }

  typeRun() {
    if (!this.runFlag) {
      this.runFlag = true;
      return 'run';
    }
  }

  getParentId(origParentId?: string): string | undefined {
    if (!origParentId) {
      return;
    } else if (this.parentIdMap[origParentId]) {
      return this.getParentId(this.parentIdMap[origParentId]);
    }
    if (this.steps[origParentId]) {
      return origParentId;
    }
  }

  async handleLLMStart(
    llm: Serialized,
    prompts: string[],
    runId: string,
    parentRunId?: string | undefined,
    extraParams?: Record<string, unknown> | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    name?: string | undefined
  ) {
    const provider = llm.id[llm.id.length - 1];
    const settings: Record<string, any> = extraParams?.invocation_params || {};
    // make sure there is no api key specification
    delete settings.apiKey;
    delete settings.api_key;
    const model = settings.model || settings.modelName;
    this.completionGenerations[runId] = {
      provider,
      model,
      settings,
      prompt: prompts[0],
      start: Date.now(),
      outputTokenCount: 0
    };
    const step = await this.client
      .step({
        name: name || model,
        type: 'llm',
        tags: tags,
        threadId: this.threadId,
        id: runId,
        startTime: new Date().toISOString(),
        parentId: this.getParentId(parentRunId),
        metadata: metadata,
        input: { content: prompts }
      })
      .send();
    this.steps[runId] = step;
  }

  handleLLMNewToken(
    token: string,
    idx: NewTokenIndices,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    fields?: HandleLLMNewTokenCallbackFields | undefined
  ) {
    const start =
      this.completionGenerations[runId] || this.chatGenerations[runId];
    start.outputTokenCount += 1;
    if (!start.ttFirstToken) {
      start.ttFirstToken = Date.now() - start.start;
    }
  }

  async handleLLMError(
    err: any,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    this.steps[runId].error = err;
    this.steps[runId].endTime = new Date().toISOString();
    await this.steps[runId].send();
  }
  async handleLLMEnd(
    output: LLMResult,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    const completionGeneration = this.completionGenerations[runId];
    const chatGeneration = this.chatGenerations[runId];

    if (completionGeneration) {
      const {
        start,
        outputTokenCount,
        ttFirstToken,
        prompt,
        model,
        provider,
        settings
      } = this.completionGenerations[runId];
      const duration = Date.now() - start;
      const tokenThroughputInSeconds =
        duration && outputTokenCount ? outputTokenCount / (duration / 1000) : 0;
      this.steps[runId].generation = new CompletionGeneration({
        provider,
        model,
        settings,
        completion: output.generations[0][0].text,
        prompt: prompt,
        duration,
        ttFirstToken,
        outputTokenCount,
        tokenThroughputInSeconds: tokenThroughputInSeconds
      });
      this.steps[runId].output = output.generations[0][0];
      this.steps[runId].endTime = new Date().toISOString();
    } else if (chatGeneration) {
      const {
        promptId,
        variables,
        start,
        outputTokenCount,
        ttFirstToken,
        inputMessages,
        model,
        provider,
        settings,
        tools
      } = this.chatGenerations[runId];
      const duration = Date.now() - start;
      const tokenThroughputInSeconds =
        duration && outputTokenCount ? outputTokenCount / (duration / 1000) : 0;
      const messageCompletion = convertMessage(
        (output.generations[0][0] as any).message
      );

      this.steps[runId].generation = new ChatGeneration({
        promptId,
        variables,
        provider,
        model,
        settings,
        tools,
        messageCompletion,
        messages: inputMessages,
        duration,
        ttFirstToken,
        outputTokenCount,
        tokenThroughputInSeconds: tokenThroughputInSeconds
      });
      this.steps[runId].generation!.inputTokenCount =
        output.llmOutput?.estimatedTokenUsage?.promptTokens;
      this.steps[runId].generation!.outputTokenCount =
        output.llmOutput?.estimatedTokenUsage?.completionTokens;
      this.steps[runId].generation!.tokenCount =
        output.llmOutput?.estimatedTokenUsage?.totalTokens;

      this.steps[runId].output = messageCompletion;
      this.steps[runId].endTime = new Date().toISOString();
    }
    await this.steps[runId].send();
  }
  async handleChatModelStart(
    llm: Serialized,
    messages: BaseMessage[][],
    runId: string,
    parentRunId?: string | undefined,
    extraParams?: Record<string, unknown> | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    name?: string | undefined
  ) {
    const provider = llm.id[llm.id.length - 1];
    const settings: Record<string, any> = extraParams?.invocation_params || {};

    //make sure there is no api key specification
    delete settings.apiKey;
    delete settings.api_key;

    const messageList = messages[0];

    const { promptId, variables } = checkForLiteralPrompt(messageList);

    const model = settings.model || settings.modelName;
    const tools = settings.tools || [];
    this.chatGenerations[runId] = {
      promptId,
      variables,
      provider,
      model,
      settings,
      tools,
      inputMessages: messageList.map(convertMessage),
      start: Date.now(),
      outputTokenCount: 0
    };

    const step = await this.client
      .step({
        name: name || model,
        type: 'llm',
        tags: tags,
        threadId: this.threadId,
        id: runId,
        startTime: new Date().toISOString(),
        parentId: this.getParentId(parentRunId),
        metadata: metadata,
        input: { content: messages[0] }
      })
      .send();
    this.steps[runId] = step;
  }
  async handleChainStart(
    chain: Serialized,
    inputs: ChainValues,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    runType?: string | undefined,
    name?: string | undefined
  ) {
    const chainType = chain.id[chain.id.length - 1];
    // if (!runType || !name) {
    //   if (!chainType.toLowerCase().includes('runnable')) {
    //     name = chainType;
    //   } else {
    //     if (parentRunId) {
    //       this.parentIdMap[runId] = parentRunId;
    //     }
    //     return;
    //   }
    // }
    const step = await this.client
      .step({
        name: name || chainType,
        type: this.typeRun() || 'tool',
        tags: tags,
        threadId: this.threadId,
        id: runId,
        startTime: new Date().toISOString(),
        parentId: this.getParentId(parentRunId),
        metadata: metadata,
        input: inputs
      })
      .send();
    this.steps[runId] = step;
  }
  async handleChainError(
    err: any,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    kwargs?:
      | {
          inputs?: Record<string, unknown> | undefined;
        }
      | undefined
  ) {
    if (!this.steps[runId]) {
      return;
    }
    this.steps[runId].error = err;
    this.steps[runId].endTime = new Date().toISOString();
    await this.steps[runId].send();
  }
  async handleChainEnd(
    outputs: ChainValues,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    kwargs?:
      | {
          inputs?: Record<string, unknown> | undefined;
        }
      | undefined
  ) {
    if (!this.steps[runId]) {
      return;
    }
    this.steps[runId].output = outputs;
    this.steps[runId].endTime = new Date().toISOString();
    await this.steps[runId].send();
  }
  async handleToolStart(
    tool: Serialized,
    input: string,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    name?: string | undefined
  ) {
    const step = await this.client
      .step({
        name: name || tool.id[tool.id.length - 1],
        type: 'tool',
        tags: tags,
        threadId: this.threadId,
        id: runId,
        startTime: new Date().toISOString(),
        parentId: this.getParentId(parentRunId),
        metadata: metadata,
        input: { content: input }
      })
      .send();
    this.steps[runId] = step;
  }
  async handleToolError(
    err: any,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    await this.handleChainError(err, runId, parentRunId, tags);
  }
  async handleToolEnd(
    output: string,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    await this.handleChainEnd(output as any, runId, parentRunId, tags);
  }

  async handleRetrieverStart(
    retriever: Serialized,
    query: string,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    name?: string | undefined
  ) {
    await this.client.step({
      name: name || retriever.id[retriever.id.length - 1],
      type: 'retrieval',
      tags: tags,
      threadId: this.threadId,
      id: runId,
      startTime: new Date().toISOString(),
      parentId: this.getParentId(parentRunId),
      metadata: metadata,
      input: { content: query }
    });
  }
  async handleRetrieverEnd(
    documents: DocumentInterface<Record<string, any>>[],
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    this.steps[runId].output = documents;
    this.steps[runId].endTime = new Date().toISOString();
    await this.steps[runId].send();
  }
  async handleRetrieverError(
    err: any,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined
  ) {
    await this.handleChainError(err, runId, parentRunId, tags);
  }
}
