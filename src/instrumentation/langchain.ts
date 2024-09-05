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
import { v5 as uuidv5 } from 'uuid';
import { validate as uuidValidate } from 'uuid';

import {
  ChatGeneration,
  CompletionGeneration,
  IGenerationMessage,
  ITool,
  LiteralClient
} from '..';
import { Step } from '../observability/step';

// For some reason, the tool call-id is present in the assistant message but not the tool one
// We patch this for proper display in Literal AI
function addToolCallIdToMessages(messages: IGenerationMessage[]) {
  let lastToolCallId: string | null;

  return messages.map((message) => {
    if (message.role === 'assistant') {
      if (message.tool_call_id) {
        lastToolCallId = message.tool_call_id;
      }

      return message;
    }

    if (message.role === 'tool' && lastToolCallId) {
      message.tool_call_id = lastToolCallId;
    }

    lastToolCallId = null;
    return message;
  });
}

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
  metadata?: Record<string, unknown>;
  tags?: string[];
}

interface CompletionGenerationStart {
  provider: string;
  model: string;
  settings: Record<string, any>;
  prompt: string;
  start: number;
  outputTokenCount: number;
  ttFirstToken?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
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
  const [toolCall] = message.additional_kwargs.tool_calls || [];

  let toolCallBlock:
    | Pick<IGenerationMessage, 'tool_call_id' | 'tool_calls'>
    | undefined;

  if (toolCall) {
    toolCallBlock = {
      tool_call_id: toolCall.id,
      tool_calls: [toolCall]
    };
  }

  const functionCall = message.additional_kwargs.function_call;

  const content =
    !functionCall && !toolCallBlock ? (message.content as any) : null;

  return {
    name: message.name,
    role: convertMessageRole(message._getType()),
    content,
    function_call: functionCall,
    ...(toolCallBlock && toolCallBlock),
    uuid: uuid,
    templated: !!uuid
  };
}

const defaultChainTypesToIgnore: string[] = [
  'RunnableSequence',
  'RunnableCallable',
  'RunnableLambda',
  'RunnableAssign',
  'RunnableMap',
  'RunnablePassthrough',
  'CompiledStateGraph',
  'ToolNode'
];

export class LiteralCallbackHandler extends BaseCallbackHandler {
  private NAMESPACE_UUID = '53864724-0779-41aa-ab6e-7246395aafcd';
  name = 'literal_handler';

  client: LiteralClient;

  threadId?: string;
  chainTypesToIgnore: string[] = defaultChainTypesToIgnore;

  steps: Record<string, Step> = {};
  completionGenerations: Record<string, CompletionGenerationStart> = {};
  chatGenerations: Record<string, ChatGenerationStart> = {};
  parentIdMap: Record<string, string> = {};

  constructor(
    client: LiteralClient,
    threadId?: string,
    chainTypesToIgnore?: string[]
  ) {
    super();
    this.client = client;
    this.threadId = threadId;

    if (chainTypesToIgnore) {
      this.chainTypesToIgnore.push(...chainTypesToIgnore);
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

  async createThread(threadName: string, parentId?: string) {
    if (this.threadId) {
      return;
    }

    if (this.client._currentThread()) {
      return;
    }

    const newThreadId = uuidv5(threadName as string, this.NAMESPACE_UUID);

    if (this.threadId === newThreadId) {
      return;
    }

    const thread = await this.client
      .thread({
        id: uuidv5(threadName as string, this.NAMESPACE_UUID),
        name: threadName as string
      })
      .upsert();

    this.threadId = thread.id;

    const parent = parentId ? this.steps[parentId] : null;

    // In certain cases we get the thread_id after steps have been created
    // We need to update the thread_id for the parent and children steps
    if (parent && parent.threadId !== thread.id) {
      parent.threadId = thread.id;
      await parent.send();

      const childrenSteps = Object.values(this.steps).filter(
        (step) => step.parentId === parent.id
      );

      await Promise.all(
        childrenSteps.map(async (step) => {
          step.threadId = thread.id;
          await step.send();
        })
      );
    }
  }

  getGenerationStepId(metadata?: Record<string, unknown> | undefined) {
    const generationStepIdFromMetadata = metadata?.literalaiStepId;

    if (typeof generationStepIdFromMetadata !== 'string') {
      return null;
    }

    if (!uuidValidate(generationStepIdFromMetadata)) {
      return null;
    }

    // The stepId from metadata can only be used on one generation
    if (
      Object.values(this.steps).find(
        (step) => step.id === generationStepIdFromMetadata
      )
    ) {
      return null;
    }

    return generationStepIdFromMetadata;
  }

  /**
   * LLM Callbacks
   */

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

    delete settings.apiKey;
    delete settings.api_key;

    this.completionGenerations[runId] = {
      provider,
      model,
      settings,
      prompt: prompts[0],
      start: Date.now(),
      outputTokenCount: 0,
      metadata,
      tags
    };

    const parentId = this.getParentId(parentRunId);

    if (parentId || this.threadId) {
      const step = await this.client
        .step({
          name: name || model,
          type: 'llm',
          tags: tags,
          threadId: this.threadId,
          id: this.getGenerationStepId(metadata),
          startTime: new Date().toISOString(),
          parentId: this.getParentId(parentRunId),
          metadata: metadata,
          input: { content: prompts }
        })
        .send();
      this.steps[runId] = step;
    }
  }

  handleLLMNewToken(
    _token: string,
    _idx: NewTokenIndices,
    runId: string,
    _parentRunId?: string | undefined,
    _tags?: string[] | undefined,
    _fields?: HandleLLMNewTokenCallbackFields | undefined
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
    _parentRunId?: string | undefined,
    _tags?: string[] | undefined
  ) {
    this.steps[runId].error = err;
    this.steps[runId].endTime = new Date().toISOString();
    await this.steps[runId].send();
  }
  async handleLLMEnd(
    output: LLMResult,
    runId: string,
    _parentRunId?: string | undefined,
    _tags?: string[] | undefined
  ) {
    const completionGeneration = this.completionGenerations[runId];
    const chatGeneration = this.chatGenerations[runId];

    try {
      if (completionGeneration) {
        const {
          start,
          outputTokenCount,
          ttFirstToken,
          prompt,
          model,
          provider,
          settings,
          metadata,
          tags
        } = this.completionGenerations[runId];
        const duration = (Date.now() - start) / 1000;
        const tokenThroughputInSeconds =
          duration && outputTokenCount
            ? outputTokenCount / (duration / 1000)
            : undefined;

        const generation = new CompletionGeneration({
          metadata,
          tags,
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

        if (this.steps[runId]) {
          this.steps[runId].generation = generation;
          this.steps[runId].output = output.generations[0][0];
          this.steps[runId].endTime = new Date().toISOString();

          await this.steps[runId].send();
        } else {
          await this.client.api.createGeneration({
            ...generation,
            id: this.getGenerationStepId(metadata)
          });
        }
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
          tools,
          metadata,
          tags
        } = this.chatGenerations[runId];

        const duration = (Date.now() - start) / 1000;
        const tokenThroughputInSeconds =
          duration && outputTokenCount
            ? outputTokenCount / (duration / 1000)
            : undefined;
        const messageCompletion = convertMessage(
          (output.generations[0][0] as any).message
        );

        const generation = new ChatGeneration({
          metadata,
          tags,
          promptId,
          variables,
          provider,
          model,
          settings,
          tools,
          messageCompletion,
          messages: addToolCallIdToMessages(inputMessages),
          duration,
          ttFirstToken,
          outputTokenCount,
          tokenThroughputInSeconds: tokenThroughputInSeconds
        });

        if (this.steps[runId]) {
          this.steps[runId].generation = generation;
          this.steps[runId].generation!.inputTokenCount =
            output.llmOutput?.estimatedTokenUsage?.promptTokens;
          this.steps[runId].generation!.outputTokenCount =
            output.llmOutput?.estimatedTokenUsage?.completionTokens;
          this.steps[runId].generation!.tokenCount =
            output.llmOutput?.estimatedTokenUsage?.totalTokens;

          this.steps[runId].output = messageCompletion;
          this.steps[runId].endTime = new Date().toISOString();

          await this.steps[runId].send();
        } else {
          await this.client.api.createGeneration({
            ...generation,
            id: this.getGenerationStepId(metadata)
          });
        }
      }
    } catch (e) {
      console.error(e);
      console.log('Error in handleLLMEnd', e);
    }
  }

  /**
   * Chat Model Callbacks
   */

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

    // make sure there is no api key specification
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
      outputTokenCount: 0,
      metadata,
      tags
    };

    const parentId = this.getParentId(parentRunId);

    // If a thread_id has been passed in the metadata, we only get it at the ChatModelStart level
    // So that is when we create the corresponding thread
    if (metadata?.thread_id) {
      await this.createThread(metadata.thread_id as string, parentId);
    }

    if (this.threadId || parentId) {
      const step = await this.client
        .step({
          name: name || model,
          type: 'llm',
          tags: tags,
          threadId: this.threadId,
          id: this.getGenerationStepId(metadata),
          startTime: new Date().toISOString(),
          parentId: parentId,
          metadata,
          input: { content: messages[0] }
        })
        .send();

      this.steps[runId] = step;
    }
  }

  /**
   * Chain Callbacks
   */

  async handleChainStart(
    chain: Serialized,
    inputs: ChainValues,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    _runType?: string | undefined,
    name?: string | undefined
  ) {
    const chainType = chain.id[chain.id.length - 1];

    const currentThread = this.client._currentThread();
    if (currentThread) {
      this.threadId = currentThread.id;
    }

    if (parentRunId) {
      this.parentIdMap[runId] = parentRunId;
    }

    const parentId = this.getParentId(parentRunId);

    let stepInput;

    if (inputs instanceof BaseMessage) {
      stepInput = convertMessage(inputs);
    } else {
      if (inputs.messages) {
        const messages = inputs.messages.map(convertMessage) ?? null;

        stepInput = { messages };

        const lastMessage = messages[messages.length - 1];

        // This heuristics is used to capture the initial input that triggered the flow
        if (chainType === 'RunnableSequence' && lastMessage) {
          const initialInput = { content: lastMessage };

          if (parentId) {
            if (!this.steps[parentId].input) {
              this.steps[parentId].input = initialInput;
            }
          } else {
            if (!this.steps[runId].input) {
              this.steps[runId].input = initialInput;
            }
          }
        }
      } else {
        stepInput = inputs;
      }
    }

    if (!parentRunId) {
      // The chain with no parent run is the root of the run
      const step = await this.client
        .run({
          name: name || chainType,
          threadId: this.threadId,
          id: runId,
          input: stepInput,
          startTime: new Date().toISOString(),
          metadata,
          tags
        })
        .send();

      this.steps[runId] = step;

      return;
    }

    if (
      parentRunId &&
      !this.chainTypesToIgnore.includes(chainType) &&
      !tags?.includes('langsmith:hidden')
    ) {
      const step = await this.client
        .step({
          name: name || chainType,
          type: 'tool',
          parentId,
          tags: tags,
          metadata,
          threadId: this.threadId,
          id: runId,
          input: stepInput,
          startTime: new Date().toISOString()
        })
        .send();

      this.steps[runId] = step;
    }
  }

  async handleChainError(
    err: any,
    runId: string,
    _parentRunId?: string | undefined,
    _tags?: string[] | undefined,
    _kwargs?:
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
    _parentRunId?: string | undefined,
    _tags?: string[] | undefined,
    _kwargs?:
      | {
          inputs?: Record<string, unknown> | undefined;
        }
      | undefined
  ) {
    if (!this.steps[runId]) {
      return;
    }

    // Don't overwrite if the step already has an output set
    // This should only happen with user messages
    if (this.steps[runId].output) {
      return;
    }

    let curatedOutput: Record<string, any> = {};
    if (outputs.messages) {
      const lastMessage = outputs.messages[outputs.messages.length - 1];
      curatedOutput = { message: lastMessage.content };
    }
    if (outputs.content) {
      curatedOutput.content = outputs.content;
    }
    if (outputs.name) {
      curatedOutput.name = outputs.name;
    }
    if (outputs.tool_call_id) {
      curatedOutput.tool_call_id = outputs.tool_call_id;
    }
    if (outputs.output) {
      curatedOutput.output = outputs.output;
    }

    if (Object.keys(curatedOutput).length === 0) {
      curatedOutput = { output: outputs };
    }

    this.steps[runId].output = curatedOutput;
    this.steps[runId].endTime = new Date().toISOString();

    await this.steps[runId].send();
  }

  /**
   * Tool Callbacks
   */

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

  /**
   * Retrieval Callbacks
   */

  async handleRetrieverStart(
    retriever: Serialized,
    query: string,
    runId: string,
    parentRunId?: string | undefined,
    tags?: string[] | undefined,
    metadata?: Record<string, unknown> | undefined,
    name?: string | undefined
  ) {
    const step = await this.client.step({
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
    this.steps[runId] = step;
  }

  async handleRetrieverEnd(
    documents: DocumentInterface[],
    runId: string,
    _parentRunId?: string | undefined,
    _tags?: string[] | undefined
  ) {
    this.steps[runId].output = { documents };

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
