import type OpenAI from 'openai';
import type { Assistant } from 'openai/resources/beta/assistants';
import type { Message } from 'openai/resources/beta/threads/messages';
import type { Run } from 'openai/resources/beta/threads/runs/runs';
import type {
  RunStep,
  ToolCallsStepDetails
} from 'openai/resources/beta/threads/runs/steps';
import { v5 as uuidv5 } from 'uuid';

import { LiteralClient } from '..';
import { Attachment } from '../observability/attachment';
import { ChatGeneration } from '../observability/generation';
import { User } from '../utils';

class OpenAIAssistantSyncer {
  private NAMESPACE_UUID = '1b671a64-40d5-491e-99b0-da01ff1f3341';

  private openai: OpenAI;
  private client: LiteralClient;

  constructor(openai: OpenAI, client: LiteralClient) {
    this.openai = openai;
    this.client = client;
  }

  generateUUIDv5FromID(id: string): string {
    return uuidv5(id, this.NAMESPACE_UUID);
  }

  async processMessageContent(threadId: string, message: Message) {
    const litThreadId = this.generateUUIDv5FromID(threadId);

    const output = { content: '' };
    const attachments: Attachment[] = [];
    for (const content of message.content) {
      if (content.type === 'image_file') {
        const file = await this.openai.files.content(
          content.image_file.file_id
        );
        const attachmentId = this.generateUUIDv5FromID(
          content.image_file.file_id
        );
        const mime = 'image/png';

        if (file.body) {
          const attachment = await this.client.api.createAttachment({
            threadId: litThreadId,
            id: attachmentId,
            content: file.body,
            mime
          });

          attachments.push(attachment);
        }
      } else if (content.type === 'text') {
        output.content += content.text.value;
      }
    }
    return {
      output,
      attachments
    };
  }

  async processMessage(
    threadId: string,
    assistant: Assistant,
    message: Message
  ) {
    const createdAt = new Date(message.created_at * 1000).toISOString();
    const { output, attachments } = await this.processMessageContent(
      threadId,
      message
    );

    const step = this.client.step({
      id: this.generateUUIDv5FromID(message.id),
      createdAt: createdAt,
      startTime: createdAt,
      endTime: createdAt,
      type: message.role === 'user' ? 'user_message' : 'assistant_message',
      name: message.role === 'user' ? 'User' : assistant.name || 'assistant',
      threadId: this.generateUUIDv5FromID(threadId),
      output,
      metadata: {},
      generation: null,
      attachments
    });

    await step.send();
  }

  async processTool(
    litThreadId: string,
    assistant: Assistant,
    runId: string,
    runStep: RunStep
  ) {
    const createdAt = new Date(runStep.created_at * 1000).toISOString();

    const endTime = runStep.completed_at
      ? new Date(runStep.completed_at * 1000).toISOString()
      : null;
    const toolCall = (runStep.step_details as ToolCallsStepDetails)
      .tool_calls[0];

    // @ts-expect-error "retrieval" is not in the type
    const type = toolCall.type === 'retrieval' ? 'retrieval' : 'tool';
    let input = {};
    let output = {};
    let name = '';

    const metadata: Record<string, any> = {};

    if ('code_interpreter' in toolCall) {
      name = 'Code Interpreter';
      input = { content: toolCall.code_interpreter.input };
      for (const toolCallOutput of toolCall.code_interpreter.outputs) {
        if (toolCallOutput.type === 'image') {
          output = { content: toolCallOutput.image.file_id };
        } else if (toolCallOutput.type === 'logs') {
          output = { content: toolCallOutput.logs };
        }
      }
    } else if ('retrieval' in toolCall) {
      name = 'Retrieval';
      input = toolCall.retrieval || {};
    } else if ('function' in toolCall) {
      name = toolCall.function.name;
      input = JSON.parse(toolCall.function.arguments);
      output = { content: toolCall.function.output };
    }

    const step = this.client.step({
      parentId: this.generateUUIDv5FromID(runId),
      threadId: litThreadId,
      id: this.generateUUIDv5FromID(runStep.id),
      createdAt: createdAt,
      startTime: createdAt,
      endTime: endTime,
      type: type,
      name,
      input,
      output,
      error: runStep.last_error,
      metadata,
      generation: null
    });

    await step.send();
  }

  async processRun(threadId: string, assistant: Assistant, run: Run) {
    const litThreadId = this.generateUUIDv5FromID(threadId);
    const steps = await this.openai.beta.threads.runs.steps.list(
      threadId,
      run.id
    );

    const createdAt = new Date(run.created_at * 1000).toISOString();
    const endTime = run.completed_at
      ? new Date(run.completed_at * 1000).toISOString()
      : null;

    const generation = new ChatGeneration({
      provider: 'openai-assistant',
      model: assistant.model,
      inputTokenCount: run.usage?.prompt_tokens,
      outputTokenCount: run.usage?.completion_tokens,
      tokenCount: run.usage?.total_tokens,
      tools: run.tools as any
    });

    const step = this.client.step({
      threadId: litThreadId,
      id: this.generateUUIDv5FromID(run.id),
      createdAt: createdAt,
      startTime: createdAt,
      endTime: endTime,
      input: { content: run.instructions },
      generation,
      type: 'run',
      name: assistant.name || 'assistant'
    });

    await step.send();

    const toolPromises = steps.data
      .filter((s) => s.type === 'tool_calls')
      .map((s) => this.processTool(litThreadId, assistant, run.id, s));
    await Promise.all(toolPromises);
  }

  /**
   * Logs a thread and all its messages and runs to the Literal AI API.
   * @param threadId The ID of the thread to log to
   * @param user A User instance containing the information of the user that participated in the thread
   * @param threadMetadata Additional metadata to attach to the thread, in key-value pairs
   */
  async syncThread(
    threadId: string,
    user?: User,
    threadMetadata?: Record<string, any>
  ) {
    let userId: string | undefined = undefined;
    if (user) {
      userId = await this.client.api.getOrCreateUser(
        user.identifier,
        user.metadata
      );
    }

    const litThreadId = this.generateUUIDv5FromID(threadId);

    const messages = await this.openai.beta.threads.messages.list(threadId);

    const runs = await this.openai.beta.threads.runs.list(threadId);

    const assistantId = messages.data.length
      ? messages.data[0].assistant_id
      : runs.data.length
      ? runs.data[0].assistant_id
      : '';

    const name =
      // @ts-expect-error not expecting images here
      messages.data.filter((m) => m.role === 'user')?.[0]?.content[0].text
        ?.value;

    if (!assistantId) {
      throw new Error('No assistant found');
    }
    const assistant = await this.openai.beta.assistants.retrieve(assistantId);

    await this.client.api.upsertThread({
      threadId: litThreadId,
      name,
      metadata: {
        assistantId,
        threadId,
        assistantName: assistant.name,
        ...threadMetadata
      },
      participantId: userId
    });

    const messagePromises = messages.data.map((m) =>
      this.processMessage(threadId, assistant, m)
    );
    const runPromises = runs.data.map((r) =>
      this.processRun(threadId, assistant, r)
    );

    await Promise.all([...messagePromises, ...runPromises]);
  }
}

export default (client: LiteralClient) => (openai: OpenAI) => ({
  assistant: {
    syncer: new OpenAIAssistantSyncer(openai, client)
  }
});
