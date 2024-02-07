/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import {
  HandleLLMNewTokenCallbackFields,
  NewTokenIndices
} from '@langchain/core/callbacks/base';
import { DocumentInterface } from '@langchain/core/documents';
import { Serialized } from '@langchain/core/load/serializable';
import { BaseMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import { ChainValues } from '@langchain/core/utils/types';

import {
  ChatGeneration,
  CompletionGeneration,
  IGenerationMessage,
  ITool,
  LiteralClient
} from '..';
import { Step } from '../types';

interface ChatGenerationStart {
  provider: string;
  model: string;
  settings: Record<string, any>;
  tools: ITool[];
  inputMessages: IGenerationMessage[];
  start: number;
  tokenCount: number;
  ttFirstToken?: number;
}

interface CompletionGenerationStart {
  provider: string;
  model: string;
  settings: Record<string, any>;
  prompt: string;
  start: number;
  tokenCount: number;
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

function convertMessage(message: BaseMessage): IGenerationMessage {
  return {
    name: message.name,
    role: convertMessageRole(message._getType()),
    content: message.content as any,
    function_call: message.additional_kwargs.function_call
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
  threadId: string;

  constructor(client: LiteralClient, threadId: string) {
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
    const model = settings.model || settings.modelName;
    this.completionGenerations[runId] = {
      provider,
      model,
      settings,
      prompt: prompts[0],
      start: Date.now(),
      tokenCount: 0
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
        input: prompts[0]
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
    start.tokenCount += 1;
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
        tokenCount,
        ttFirstToken,
        prompt,
        model,
        provider,
        settings
      } = this.completionGenerations[runId];
      const duration = Date.now() - start;
      const tokenThroughputInSeconds =
        duration && tokenCount ? tokenCount / (duration / 1000) : 0;
      this.steps[runId].generation = new CompletionGeneration({
        provider,
        model,
        settings,
        completion: output.generations[0][0].text,
        prompt: prompt,
        duration,
        ttFirstToken,
        tokenThroughputInSeconds: tokenThroughputInSeconds
      });
      this.steps[runId].output = output.generations[0][0].text;
      this.steps[runId].endTime = new Date().toISOString();
    } else if (chatGeneration) {
      const {
        start,
        tokenCount,
        ttFirstToken,
        inputMessages,
        model,
        provider,
        settings,
        tools
      } = this.chatGenerations[runId];
      const duration = Date.now() - start;
      const tokenThroughputInSeconds =
        duration && tokenCount ? tokenCount / (duration / 1000) : 0;
      const messageCompletion = convertMessage(
        (output.generations[0][0] as any).message
      );
      this.steps[runId].generation = new ChatGeneration({
        provider,
        model,
        settings,
        tools,
        messageCompletion,
        messages: inputMessages,
        duration,
        ttFirstToken,
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
    const model = settings.model || settings.modelName;
    const tools = settings.tools || [];
    this.chatGenerations[runId] = {
      provider,
      model,
      settings,
      tools,
      inputMessages: messages[0].map(convertMessage),
      start: Date.now(),
      tokenCount: 0
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
        input: messages[0]
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
    if (!runType || !name) {
      if (!chainType.toLowerCase().includes('runnable')) {
        name = chainType;
      } else {
        if (parentRunId) {
          this.parentIdMap[runId] = parentRunId;
        }
        return;
      }
    }
    const step = await this.client
      .step({
        name: name,
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
        input: input
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
      input: query
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
