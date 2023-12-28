import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { lookup } from 'mime-types';
import { v4 as uuidv4 } from 'uuid';

import { Attachment, CreateAttachmentSpec, Maybe, Step, User } from './types';

const stepFields = `
    id
    threadId
    parentId
    startTime
    endTime
    createdAt
    type
    input
    output
    metadata
    feedback {
        id
        value
        comment
    }
    tags
    generation {
        type
        provider
        settings
        inputs
        completion
        templateFormat
        template
        formatted
        messages
        tokenCount
    }
    name
    attachments {
        id
        stepId
        metadata
        mime
        name
        objectKey
        url
    }`;

const threadFields = `
    id
    metadata
    tags
    createdAt
    participant {
        id
        identifier
        metadata
    }
    steps {
        ${stepFields}
    }`;

// const shallowThreadFields = `
//     id
//     metadata
//     tags
//     createdAt
//     participant {
//         id
//         identifier
//         metadata
//     }`;

function serialize(step: Step, id: number) {
  const result: any = {};

  for (const [key, value] of Object.entries(step.serialize())) {
    result[`${key}_${id}`] = value;
  }

  return result;
}

function variablesBuilder(steps: Step[]) {
  let variables: any = {};
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    variables = { ...variables, ...serialize(step, i) };
  }
  return variables;
}

function ingestStepsFieldsBuilder(steps: Step[]) {
  let generated = '';
  for (let id = 0; id < steps.length; id++) {
    generated += `$id_${id}: String!
        $threadId_${id}: String!
        $type_${id}: StepType
        $startTime_${id}: DateTime
        $endTime_${id}: DateTime
        $input_${id}: String
        $output_${id}:String
        $metadata_${id}: Json
        $parentId_${id}: String
        $name_${id}: String
        $generation_${id}: GenerationPayloadInput
        $feedback_${id}: FeedbackPayloadInput
        $attachments_${id}: [AttachmentPayloadInput!]
        `;
  }
  return generated;
}

function ingestStepsArgsBuilder(steps: Step[]) {
  let generated = '';
  for (let id = 0; id < steps.length; id++) {
    generated += `
      step${id}: ingestStep(
        id: $id_${id}
        threadId: $threadId_${id}
        startTime: $startTime_${id}
        endTime: $endTime_${id}
        type: $type_${id}
        input: $input_${id}
        output: $output_${id}
        metadata: $metadata_${id}
        parentId: $parentId_${id}
        name: $name_${id}
        generation: $generation_${id}
        feedback: $feedback_${id}
        attachments: $attachments_${id}
      ) {
        ok
        message
      }
`;
  }
  return generated;
}

function ingestStepsQueryBuilder(steps: Step[]) {
  return `
    mutation AddStep(${ingestStepsFieldsBuilder(steps)}) {
      ${ingestStepsArgsBuilder(steps)}
    }
    `;
}

export class API {
  private apiKey: string;
  private url: string;
  private graphqlEndpoint: string;

  constructor(apiKey: string, url: string) {
    this.apiKey = apiKey;
    this.url = url;
    this.graphqlEndpoint = `${url}/api/graphql`;

    if (!this.apiKey) {
      throw new Error('CHAINLIT_API_KEY not set');
    }
    if (!this.url) {
      throw new Error('CHAINLIT_API_URL not set');
    }
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };
  }

  private async makeApiCall(query: string, variables: any) {
    try {
      const response = await axios({
        url: this.graphqlEndpoint,
        method: 'post',
        headers: this.headers,
        data: {
          query: query,
          variables: variables
        }
      });

      if (response.data.errors) {
        throw new Error(JSON.stringify(response.data.errors));
      }

      return response.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        throw new Error(JSON.stringify(e.response?.data.errors));
      } else {
        throw e;
      }
    }
  }

  async sendSteps(steps: Step[]) {
    const query = ingestStepsQueryBuilder(steps);
    const variables = variablesBuilder(steps);

    return this.makeApiCall(query, variables);
  }

  async createAttachment(threadId: string, spec: CreateAttachmentSpec) {
    if (!spec.content && !spec.url && !spec.path) {
      throw new Error(
        'Either content, path or attachment url must be provided'
      );
    }

    if (spec.content && spec.path) {
      throw new Error('Only one of content and path must be provided');
    }

    if ((spec.content && spec.url) || (spec.path && spec.url)) {
      throw new Error(
        'Only one of content, path and attachment url must be provided'
      );
    }

    if (spec.path) {
      if (!spec.name) {
        spec.name = spec.path.split('/').pop() || '';
      }
      if (!spec.mime) {
        spec.mime = lookup(spec.path) || 'application/octet-stream';
      }
    }

    if (!spec.name) {
      throw new Error('Attachment name must be provided');
    }

    if (spec.content || spec.path) {
      const uploaded = await this.uploadFile(
        spec.content,
        spec.path,
        spec.id,
        threadId,
        spec.mime
      );

      if (!uploaded.objectKey || !uploaded.url) {
        throw new Error('Failed to upload file');
      }

      spec.objectKey = uploaded.objectKey;
      spec.url = uploaded.url;
    }

    return new Attachment({
      id: spec.id,
      metadata: spec.metadata,
      mime: spec.mime,
      name: spec.name,
      objectKey: spec.objectKey
    });
  }

  async uploadFile(
    content: Maybe<any>,
    path: Maybe<string>,
    id: Maybe<string>,
    threadId: string,
    mime: Maybe<string>
  ) {
    if (!content && !path) {
      throw new Error('Either content or path must be provided');
    }

    mime = mime || 'application/octet-stream';

    id = id || uuidv4();
    const body = { fileName: id, contentType: mime, threadId: threadId };
    const endpoint = this.url + '/api/upload/file';

    const signingResponse = await axios.post(endpoint, body, {
      headers: this.headers
    });

    if (signingResponse.status !== 200) {
      console.error(`Failed to sign upload url: ${signingResponse.statusText}`);
      return { objectKey: null, url: null };
    }

    const jsonRes = signingResponse.data;
    // eslint-disable-next-line no-prototype-builtins
    const method = jsonRes.hasOwnProperty('put') ? 'put' : 'post';
    const requestDict = jsonRes[method] || {};
    const url = requestDict.url || null;

    if (!url) {
      throw new Error('Invalid server response');
    }

    let headers = requestDict.headers || null;
    const fields = requestDict.fields || {};
    const objectKey = fields.key || null;
    const uploadType = requestDict.uploadType || 'multipart';
    const signedUrl = jsonRes.signedUrl || null;
    const formData = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      formData.append(name, value);
    }

    if (path) {
      formData.append('file', createReadStream(path), {
        filename: id,
        contentType: mime
      });
      headers = { ...headers, ...formData.getHeaders() };
    } else if (content) {
      formData.append('file', content, id);
      headers = {
        ...headers,
        ...formData.getHeaders()
      };
    }

    try {
      await axios({
        method,
        url,
        headers,
        data:
          uploadType === 'raw' ? content || createReadStream(path!) : formData
      });

      return { objectKey, url: signedUrl };
    } catch (e) {
      console.error(`Failed to upload file: ${e}`);
      return { objectKey: null, url: null };
    }
  }

  async upsertThread(
    threadId: string,
    metadata?: Maybe<Record<string, any>>,
    participantId?: Maybe<string>,
    environment?: Maybe<string>,
    tags?: Maybe<string[]>
  ) {
    const query = `
    mutation UpsertThread(
      $threadId: String!,
      $metadata: Json,
      $participantId: String,
      $environment: String,
      $tags: [String!],
  ) {
      upsertThread(
          id: $threadId
          metadata: $metadata
          participantId: $participantId
          environment: $environment
          tags: $tags
      ) {
        ${threadFields}
      }
    }
    `;

    const variables = {
      threadId,
      metadata,
      participantId,
      environment,
      tags
    };

    const response = await this.makeApiCall(query, variables);
    return response.updateThread;
  }

  public async createUser(
    identifier: string,
    metadata?: Maybe<Record<string, any>>
  ): Promise<User> {
    const query = `
    mutation CreateUser($identifier: String!, $metadata: Json) {
        createParticipant(identifier: $identifier, metadata: $metadata) {
            id
            identifier
            metadata
        }
    }`;

    const variables = { identifier, metadata };

    const res = await this.makeApiCall(query, variables);

    return new User({ ...res.data.createParticipant });
  }

  public async updateUser(
    id: string,
    identifier?: string,
    metadata?: Maybe<Record<string, any>>
  ): Promise<User> {
    const query = `
    mutation UpdateUser(
        $id: String!,
        $identifier: String,
        $metadata: Json,
    ) {
        updateParticipant(
            id: $id,
            identifier: $identifier,
            metadata: $metadata
        ) {
            id
            identifier
            metadata
        }
    }`;

    const variables = { id, identifier, metadata };
    const res = await this.makeApiCall(query, variables);

    return new User({ ...res.data.updateParticipant });
  }

  public async getOrCreateUser(
    identifier: string,
    metadata?: Maybe<Record<string, any>>
  ) {
    const existingUser = await this.getUser(identifier);
    if (existingUser) {
      const updatedUser = await this.updateUser(
        existingUser.id!,
        existingUser.identifier,
        existingUser.metadata
      );
      return updatedUser.id!;
    } else {
      const createdUser = await this.createUser(identifier, metadata);
      return createdUser.id!;
    }
  }

  public async getUser(identifier: string): Promise<Maybe<User>> {
    const query = `
    query GetUser($id: String, $identifier: String) {
        participant(id: $id, identifier: $identifier) {
            id
            identifier
            metadata
            createdAt
        }
    }`;

    const variables = { identifier };

    const res = await this.makeApiCall(query, variables);
    if (res.data.participant) {
      return new User({ ...res.data.participant });
    }
  }
}
