import { getEncoding } from 'js-tiktoken';
import OpenAI from 'openai';
import { Assistant } from 'openai/resources/beta/assistants/assistants';
import { ThreadMessage } from 'openai/resources/beta/threads/messages/messages';
import { Run } from 'openai/resources/beta/threads/runs/runs';
import {
  RunStep,
  ToolCallsStepDetails
} from 'openai/resources/beta/threads/runs/steps';
import { v5 as uuidv5 } from 'uuid';

import { Chainlit } from '.';
import { ChatGeneration } from './generation';
import { Attachment, MakeAttachmentSpec, User } from './types';

class OpenAIAssistantSyncer {
  private NAMESPACE_UUID = '1b671a64-40d5-491e-99b0-da01ff1f3341';

  private openai: OpenAI;
  private client: Chainlit;

  constructor(openai: OpenAI, client: Chainlit) {
    this.openai = openai;
    this.client = client;
  }

  generateUUIDv5FromID(id: string): string {
    return uuidv5(id, this.NAMESPACE_UUID);
  }

  countToken(text?: string): number {
    const encoder = getEncoding('cl100k_base');
    return encoder.encode(text || '').length;
  }

  async processMessageContent(threadId: string, message: ThreadMessage) {
    const chainlitThreadId = this.generateUUIDv5FromID(threadId);

    let output = '';
    const attachments: Attachment[] = [];
    for (const content of message.content) {
      if (content.type === 'image_file') {
        const file = await this.openai.files.content(
          content.image_file.file_id
        );
        const attachment = await this.client.api.makeAttachment(
          chainlitThreadId,
          new MakeAttachmentSpec({
            id: this.generateUUIDv5FromID(content.image_file.file_id),
            name: content.image_file.file_id,
            content: file.body,
            mime: 'image/png'
          })
        );

        attachments.push(attachment);
      } else if (content.type === 'text') {
        output += content.text.value;
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
    message: ThreadMessage
  ) {
    const createdAt = new Date(message.created_at * 1000).toISOString();
    const { output, attachments } = await this.processMessageContent(
      threadId,
      message
    );

    const generation = new ChatGeneration({
      provider: 'openai',
      settings: { model: assistant.model },
      tokenCount: this.countToken(output)
    });

    const step = this.client.step({
      id: this.generateUUIDv5FromID(message.id),
      createdAt: createdAt,
      startTime: createdAt,
      endTime: createdAt,
      type: message.role === 'user' ? 'user_message' : 'assistant_message',
      name: message.role === 'user' ? 'User' : assistant.name || 'assistant',
      threadId: this.generateUUIDv5FromID(threadId),
      input: '',
      output,
      metadata: {},
      generation,
      attachments
    });

    await step.send();
  }

  async processTool(
    chainlitThreadId: string,
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
    const type = toolCall.type === 'retrieval' ? 'retrieval' : 'tool';
    let input = '';
    let output = '';
    let name = '';

    if ('code_interpreter' in toolCall) {
      name = 'Code Interpreter';
      input = toolCall.code_interpreter.input;
      for (const toolCallOutput of toolCall.code_interpreter.outputs) {
        if (toolCallOutput.type === 'image') {
          output = toolCallOutput.image.file_id;
        } else if (toolCallOutput.type === 'logs') {
          output = toolCallOutput.logs;
        }
      }
    } else if ('retrieval' in toolCall) {
      name = 'Retrieval';
      input = JSON.stringify(toolCall.retrieval);
    } else if ('arguments' in toolCall) {
      name = toolCall.function.name;
      input = JSON.stringify(JSON.parse(toolCall.function.arguments));
      output = toolCall.function.output || '';
    }

    const generation = new ChatGeneration({
      provider: 'openai',
      settings: { model: assistant.model },
      tokenCount: this.countToken(input + output)
    });

    const step = this.client.step({
      parentId: this.generateUUIDv5FromID(runId),
      threadId: chainlitThreadId,
      id: this.generateUUIDv5FromID(runStep.id),
      createdAt: createdAt,
      startTime: createdAt,
      endTime: endTime,
      type: type,
      name,
      input,
      output,
      metadata: {},
      generation
    });

    await step.send();
  }

  async processRun(threadId: string, assistant: Assistant, run: Run) {
    const chainlitThreadId = this.generateUUIDv5FromID(threadId);

    const steps = await this.openai.beta.threads.runs.steps.list(
      threadId,
      run.id
    );

    const createdAt = new Date(run.created_at * 1000).toISOString();
    const endTime = run.completed_at
      ? new Date(run.completed_at * 1000).toISOString()
      : null;

    const step = this.client.step({
      threadId: chainlitThreadId,
      id: this.generateUUIDv5FromID(run.id),
      createdAt: createdAt,
      startTime: createdAt,
      endTime: endTime,
      type: 'run',
      name: assistant.name || 'assistant'
    });

    await step.send();

    const toolPromises = steps.data
      .filter((s) => s.type === 'tool_calls')
      .map((s) => this.processTool(chainlitThreadId, assistant, run.id, s));
    await Promise.all(toolPromises);
  }

  async syncThread(threadId: string, user?: User) {
    let userId: string | undefined = undefined;
    if (user) {
      const existingUser = await this.client.api.getUser(user.identifier);
      if (existingUser) {
        const updatedUser = await this.client.api.updateUser(
          existingUser.id!,
          existingUser.identifier,
          existingUser.metadata
        );
        userId = updatedUser.id!;
      } else {
        const createdUser = await this.client.api.createUser(
          user.identifier,
          user.metadata
        );
        userId = createdUser.id!;
      }
    }

    const chainlitThreadId = this.generateUUIDv5FromID(threadId);

    const messages = await this.openai.beta.threads.messages.list(threadId);
    const runs = await this.openai.beta.threads.runs.list(threadId);

    const assistantId = messages.data.length
      ? messages.data[0].assistant_id
      : runs.data.length
      ? runs.data[0].assistant_id
      : '';

    if (!assistantId) {
      throw new Error('No assistant found');
    }
    const assistant = await this.openai.beta.assistants.retrieve(assistantId);

    await this.client.api.upsertThread(
      chainlitThreadId,
      { assistantId, threadId, assistantName: assistant.name },
      userId
    );

    const messagePromises = messages.data.map((m) =>
      this.processMessage(threadId, assistant, m)
    );
    const runPromises = runs.data.map((r) =>
      this.processRun(threadId, assistant, r)
    );

    await Promise.all([...messagePromises, ...runPromises]);
  }
}

export default (client: Chainlit) => (openai: OpenAI) => ({
  assistant: {
    syncer: new OpenAIAssistantSyncer(openai, client)
  }
});
