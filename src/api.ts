import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { ReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { LiteralClient } from '.';
import {
  Dataset,
  DatasetExperiment,
  DatasetExperimentItem,
  DatasetItem,
  DatasetType
} from './evaluation/dataset';
import { Score, ScoreConstructor } from './evaluation/score';
import {
  GenerationsFilter,
  GenerationsOrderBy,
  ParticipantsFilter,
  ScoresFilter,
  ScoresOrderBy,
  StepsFilter,
  StepsOrderBy,
  ThreadsFilter,
  ThreadsOrderBy
} from './filter';
import { Attachment } from './observability/attachment';
import {
  Generation,
  IGenerationMessage,
  PersistedGeneration
} from './observability/generation';
import { Step, StepType } from './observability/step';
import { CleanThreadFields, Thread } from './observability/thread';
import { IPromptRollout, Prompt } from './prompt-engineering/prompt';
import {
  Environment,
  Maybe,
  OmitUtils,
  PaginatedResponse,
  User,
  Utils
} from './utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');
const version = packageJson.version;

const stepFields = `
    id
    threadId
    rootRunId
    parentId
    startTime
    endTime
    createdAt
    type
    error
    input
    output
    metadata
    environment
    scores {
      id
      type
      name
      value
      comment
    }
    tags
    generation {
      prompt
      completion
      createdAt
      provider
      model
      variables
      messages
      messageCompletion
      tools
      settings
      stepId
      tokenCount              
      inputTokenCount         
      outputTokenCount        
      ttFirstToken          
      duration                
      tokenThroughputInSeconds
      error
      type
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
    name
    metadata
    tags
    createdAt
    participant {
        id
        identifier
        metadata
    }`;

const threadFieldsWithSteps = `
${threadFields}
steps {
  ${stepFields}
}`;

function serialize(object: Utils, id: number) {
  const result: any = {};

  for (const [key, value] of Object.entries(object.serialize())) {
    result[`${key}_${id}`] = value;
  }

  return result;
}

function variablesBuilder(objects: Utils[]) {
  let variables: any = {};
  for (let i = 0; i < objects.length; i++) {
    variables = { ...variables, ...serialize(objects[i], i) };
  }
  return variables;
}

function generationsVariablesBuilder(
  datasetId: string,
  generationIds: string[]
) {
  const variables: any = { datasetId };
  for (let i = 0; i < generationIds.length; i++) {
    const generationId = generationIds[i];
    variables[`generationId_${i}`] = generationId;
  }
  return variables;
}

function ingestStepsFieldsBuilder(steps: Step[]) {
  let generated = '';
  for (let id = 0; id < steps.length; id++) {
    generated += `$id_${id}: String!
        $threadId_${id}: String
        $rootRunId_${id}: String
        $type_${id}: StepType
        $startTime_${id}: DateTime
        $endTime_${id}: DateTime
        $error_${id}: String
        $input_${id}: Json
        $output_${id}: Json
        $metadata_${id}: Json
        $parentId_${id}: String
        $name_${id}: String
        $generation_${id}: GenerationPayloadInput
        $scores_${id}: [ScorePayloadInput!]
        $attachments_${id}: [AttachmentPayloadInput!]
        $tags_${id}: [String!]
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
        rootRunId: $rootRunId_${id}
        startTime: $startTime_${id}
        endTime: $endTime_${id}
        type: $type_${id}
        error: $error_${id}
        input: $input_${id}
        output: $output_${id}
        metadata: $metadata_${id}
        parentId: $parentId_${id}
        name: $name_${id}
        generation: $generation_${id}
        scores: $scores_${id}
        attachments: $attachments_${id}
        tags: $tags_${id}
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

function createScoresFieldsBuilder(scores: ScoreConstructor[]) {
  let generated = '';
  for (let id = 0; id < scores.length; id++) {
    generated += `$name_${id}: String!
        $type_${id}: ScoreType!
        $value_${id}: Float!
        $stepId_${id}: String
        $generationId_${id}: String
        $datasetExperimentItemId_${id}: String
        $scorer_${id}: String
        $comment_${id}: String
        $tags_${id}: [String!]
        `;
  }
  return generated;
}

function createScoresArgsBuilder(scores: ScoreConstructor[]) {
  let generated = '';
  for (let id = 0; id < scores.length; id++) {
    generated += `
      score${id}: createScore(
        name: $name_${id}
        type: $type_${id}
        value: $value_${id}
        stepId: $stepId_${id}
        generationId: $generationId_${id}
        datasetExperimentItemId: $datasetExperimentItemId_${id}
        scorer: $scorer_${id}
        comment: $comment_${id}
        tags: $tags_${id}
      ) {
        id
        name
        type
        value
        comment
        scorer
      }
    `;
  }
  return generated;
}

function createScoresQueryBuilder(scores: ScoreConstructor[]) {
  return `
    mutation CreateScores(${createScoresFieldsBuilder(scores)}) {
      ${createScoresArgsBuilder(scores)}
    }
    `;
}

function addGenerationsToDatasetFieldsBuilder(generationIds: string[]) {
  let generated = '$datasetId: String!';
  for (let id = 0; id < generationIds.length; id++) {
    generated += `
        $generationId_${id}: String!
        `;
  }
  return generated;
}

function addGenerationsToDatasetArgsBuilder(generationIds: string[]) {
  let generated = '';
  for (let id = 0; id < generationIds.length; id++) {
    generated += `
      datasetItem${id}: addGenerationToDataset(
        datasetId: $datasetId
        generationId: $generationId_${id}
      ) {
        id
        createdAt
        datasetId
        metadata
        input
        expectedOutput
        intermediarySteps
      }
    `;
  }
  return generated;
}

function addGenerationsToDatasetQueryBuilder(generationIds: string[]) {
  return `
    mutation AddGenerationsToDataset(${addGenerationsToDatasetFieldsBuilder(
      generationIds
    )}) {
      ${addGenerationsToDatasetArgsBuilder(generationIds)}
    }
    `;
}

type UploadFileBaseParams = {
  id?: Maybe<string>;
  threadId?: string;
  mime?: Maybe<string>;
};
type UploadFileParamsWithPath = UploadFileBaseParams & {
  path: string;
};
type UploadFileParamsWithContent = UploadFileBaseParams & {
  content:
    | ReadableStream<any>
    | ReadStream
    | Buffer
    | File
    | Blob
    | ArrayBuffer;
};
type CreateAttachmentParams = {
  name?: string;
  metadata?: Maybe<Record<string, any>>;
};

// TODO: Move this code to a separate file
interface QueryPromptParams {
  id?: string;
  name?: string;
  version?: number;
}

export class SharedCachePrompt {
  private static instance: SharedCachePrompt | null = null;
  private prompts: Map<string, Prompt>;
  private nameIndex: Map<string, string>;
  private nameVersionIndex: Map<string, string>;
  private lock: { locked: boolean };

  private constructor() {
    this.prompts = new Map();
    this.nameIndex = new Map();
    this.nameVersionIndex = new Map();
    this.lock = { locked: false };
  }

  static getInstance(): SharedCachePrompt {
    if (!SharedCachePrompt.instance) {
      SharedCachePrompt.instance = new SharedCachePrompt();
    }
    return SharedCachePrompt.instance;
  }

  private async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    while (this.lock.locked) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.lock.locked = true;
    try {
      return await fn();
    } finally {
      this.lock.locked = false;
    }
  }

  private getNameVersionKey(name: string, version: number): string {
    return `${name}:${version}`;
  }

  async get(params: QueryPromptParams): Promise<Prompt | undefined> {
    return this.withLock(async () => {
      const { id, name, version } = params;
      let promptId: string | undefined;

      if (id) {
        promptId = id;
      } else if (name && version) {
        promptId = this.getNameVersionKey(name, version);
      } else if (name) {
        promptId = this.nameIndex.get(name);
      }

      return promptId ? this.prompts.get(promptId) : undefined;
    });
  }

  async put(prompt: Prompt): Promise<void> {
    return this.withLock(async () => {
      this.prompts.set(prompt.id, prompt);
      this.nameIndex.set(prompt.name, prompt.id);
      this.nameVersionIndex.set(
        this.getNameVersionKey(prompt.name, prompt.version),
        prompt.id
      );
    });
  }

  async clear(): Promise<void> {
    return this.withLock(() => {
      this.prompts.clear();
      this.nameIndex.clear();
      this.nameVersionIndex.clear();
    });
  }
}

/**
 * Represents the API client for interacting with the Literal service.
 * This class handles API requests, authentication, and provides methods
 * for various operations supported by the Literal API.
 *
 * To use this API, you need to initialize a LiteralClient and access the API through it:
 *
 * ```typescript
 * const literalAiClient = new LiteralClient({apiKey: process.env["LITERAL_API_KEY"]});
 * const api = literalAiClient.api;
 * ```
 *
 * Then you can use the `api` object to make calls to the Literal service.
 */
export class API {
  /** @ignore */
  private promptCache: SharedCachePrompt;
  /** @ignore */
  public client: LiteralClient;
  /** @ignore */
  private apiKey: string;
  /** @ignore */
  private url: string;
  /** @ignore */
  private graphqlEndpoint: string;
  /** @ignore */
  private restEndpoint: string;
  /** @ignore */
  public environment: Environment | undefined;
  /** @ignore */
  public disabled: boolean;

  /** @ignore */
  constructor(
    client: LiteralClient,
    apiKey?: string,
    url?: string,
    environment?: Environment,
    disabled?: boolean
  ) {
    this.client = client;

    if (!apiKey) {
      throw new Error('LITERAL_API_KEY not set');
    }
    if (!url) {
      throw new Error('LITERAL_API_URL not set');
    }

    this.promptCache = SharedCachePrompt.getInstance();

    this.apiKey = apiKey;
    this.url = url;
    this.environment = environment;
    this.graphqlEndpoint = `${url}/api/graphql`;
    this.restEndpoint = `${url}/api`;
    this.disabled = !!disabled;
  }

  /** @ignore */
  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-client-name': 'ts-literal-client',
      'x-client-version': version,
      'x-env': this.environment
    };
  }

  /**
   * Executes a GraphQL call using the provided query and variables.
   *
   * @param query - The GraphQL query string to be executed.
   * @param variables - The variables object for the GraphQL query.
   * @returns The data part of the response from the GraphQL endpoint.
   * @throws Will throw an error if the GraphQL call returns errors or if the request fails.
   */
  private async makeGqlCall(query: string, variables: any) {
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

  /**
   * Executes a REST API call to the specified subpath with the provided body.
   *
   * @param subpath - The subpath of the REST endpoint to which the request is made.
   * @param body - The body of the POST request.
   * @returns The data part of the response from the REST endpoint.
   * @throws Will throw an error if the request fails or if the response contains errors.
   */
  private async makeApiCall(subpath: string, body: any) {
    try {
      const response = await axios({
        url: `${this.restEndpoint}${subpath}`,
        method: 'post',
        headers: this.headers,
        data: body
      });

      return response.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        throw new Error(JSON.stringify(e.response?.data));
      } else {
        throw e;
      }
    }
  }

  /**
   * Get the project id associated with the API key.
   *
   * @returns the project id
   */
  async getProjectId(): Promise<string> {
    const response = await this.makeApiCall('/my-project', {});
    return response['projectId'];
  }

  /**
   * Sends a collection of steps to the GraphQL endpoint.
   *
   * This method constructs a GraphQL query using the provided steps, then executes the query.
   *
   * @param steps - An array of Step objects to be sent.
   * @returns The response from the GraphQL call.
   */
  async sendSteps(steps: Step[]) {
    const query = ingestStepsQueryBuilder(steps);
    const variables = variablesBuilder(steps);

    return this.makeGqlCall(query, variables);
  }

  /**
   * Retrieves a paginated list of steps (runs) based on the provided criteria.
   *
   * @param variables - The parameters to filter and paginate the steps.
   * @param variables.first - The number of steps to retrieve after the cursor. (Optional)
   * @param variables.after - The cursor to start retrieving steps after. (Optional)
   * @param variables.before - The cursor to start retrieving steps before. (Optional)
   * @param variables.filters - The filters to apply on the steps retrieval. (Optional)
   * @param variables.orderBy - The order in which to retrieve the steps. (Optional)
   * @returns A promise that resolves to a paginated response of steps.
   */
  async getSteps(variables: {
    first?: Maybe<number>;
    after?: Maybe<string>;
    before?: Maybe<string>;
    filters?: StepsFilter[];
    orderBy?: StepsOrderBy;
  }): Promise<PaginatedResponse<Step>> {
    const query = `
      query GetSteps(
        $after: ID,
        $before: ID,
        $cursorAnchor: DateTime,
        $filters: [stepsInputType!],
        $orderBy: StepsOrderByInput,
        $first: Int,
        $last: Int,
        $projectId: String,
        ) {
        steps(
            after: $after,
            before: $before,
            cursorAnchor: $cursorAnchor,
            filters: $filters,
            orderBy: $orderBy,
            first: $first,
            last: $last,
            projectId: $projectId,
            ) {
            pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
            }
            totalCount
            edges {
                cursor
                node {
                  ${stepFields}
                }
            }
        }
    }`;

    const result = await this.makeGqlCall(query, variables);

    const response = result.data.steps;

    response.data = response.edges.map(
      (x: any) => new Step(this.client, x.node, true)
    );
    delete response.edges;

    return response;
  }

  /**
   * Retrieves a step by its ID.
   *
   * This method constructs a GraphQL query to fetch a step by its unique identifier.
   * It then executes the query and returns the step if found.
   *
   * @param id - The unique identifier of the step to retrieve.
   * @returns A `Promise` that resolves to the step if found, or `null` if not found.
   */
  async getStep(id: string): Promise<Maybe<Step>> {
    const query = `
        query GetStep($id: String!) {
          step(id: $id) {
            ${stepFields}
          }
        }
      `;

    const variables = { id };

    const result = await this.makeGqlCall(query, variables);

    if (!result.data.step) {
      return null;
    }

    return new Step(this.client, result.data.step, true);
  }

  /**
   * Deletes a Step from the platform by its unique identifier.
   *
   * This method constructs a GraphQL mutation to delete a step by its unique identifier.
   * It then executes the mutation and returns the ID of the deleted step.
   *
   * @param id - The unique identifier of the step to delete.
   * @returns A `Promise` that resolves to the ID of the deleted step.
   */
  async deleteStep(id: string): Promise<string> {
    const query = `
    mutation DeleteStep($id: String!) {
        deleteStep(id: $id) {
            id
        }
    }
    `;

    const variables = { id };

    const result = await this.makeGqlCall(query, variables);

    return result.data.deleteStep.id;
  }

  /**
   * Uploads a file to a specified thread. This method supports uploading either through direct content or via a file path.
   * It first signs the upload through a pre-configured endpoint and then proceeds to upload the file using the signed URL.
   *
   * @param params - The parameters for uploading a file, including:
   * @param params.content - The content of the file to upload. Optional if `path` is provided.
   * @param params.path - The path to the file to upload. Optional if `content` is provided.
   * @param params.id - The unique identifier for the file. If not provided, a UUID will be generated.
   * @param params.threadId - The unique identifier of the thread to which the file is being uploaded.
   * @param params.mime - The MIME type of the file. Defaults to 'application/octet-stream' if not provided.
   * @returns An object containing the `objectKey` of the uploaded file and the signed `url`, or `null` values if the upload fails.
   * @throws {Error} Throws an error if neither `content` nor `path` is provided, or if the server response is invalid.
   */
  async uploadFile(params: UploadFileParamsWithContent): Promise<{
    objectKey: Maybe<string>;
    url: Maybe<string>;
  }>;
  async uploadFile(params: UploadFileParamsWithPath): Promise<{
    objectKey: Maybe<string>;
    url: Maybe<string>;
  }>;
  async uploadFile({
    content,
    path,
    id,
    threadId,
    mime
  }: UploadFileParamsWithContent & UploadFileParamsWithPath): Promise<{
    objectKey: Maybe<string>;
    url: Maybe<string>;
  }> {
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

    if (signingResponse.status >= 400) {
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

  /**
   * Uploads a file to a specified thread and creates an attachment object.
   * If called inside a context, the attachment will be added to the current step and thread.
   *
   * @param params - The parameters for uploading a file, including:
   * @param params.name - The name of the file.
   * @param params.metadata - Additional metadata for the file as a key-value pair object.
   * @param params.content - The content of the file to upload. Optional if `path` is provided.
   * @param params.path - The path to the file to upload. Optional if `content` is provided.
   * @param params.id - The unique identifier for the file. If not provided, a UUID will be generated.
   * @param params.threadId - The unique identifier of the thread to which the file is being uploaded.
   * @param params.mime - The MIME type of the file. Defaults to 'application/octet-stream' if not provided.
   * @returns An object containing the `objectKey` of the uploaded file and the signed `url`, or `null` values if the upload fails.
   * @throws {Error} Throws an error if neither `content` nor `path` is provided, or if the server response is invalid.
   */
  async createAttachment(
    params: UploadFileParamsWithContent & CreateAttachmentParams
  ): Promise<Attachment>;
  async createAttachment(
    params: UploadFileParamsWithPath & CreateAttachmentParams
  ): Promise<Attachment>;
  async createAttachment(
    params: UploadFileParamsWithContent &
      UploadFileParamsWithPath &
      CreateAttachmentParams
  ): Promise<Attachment> {
    if (params.content instanceof Blob) {
      params.content = Buffer.from(await params.content.arrayBuffer());
    }
    if (params.content instanceof ArrayBuffer) {
      params.content = Buffer.from(params.content);
    }

    const threadFromStore = this.client._currentThread();
    const stepFromStore = this.client._currentStep();

    if (threadFromStore) {
      params.threadId = threadFromStore.id;
    }

    const { objectKey, url } = await this.uploadFile(params);

    const attachment = new Attachment({
      name: params.name,
      objectKey,
      mime: params.mime,
      metadata: params.metadata,
      url
    });

    if (stepFromStore) {
      if (!stepFromStore.attachments) {
        stepFromStore.attachments = [];
      }

      stepFromStore.attachments.push(attachment);
    }

    return attachment;
  }

  /**
   * Retrieves a paginated list of Generations based on the provided filters and sorting order.
   *
   * @param variables - The variables to filter and sort the Generations. It includes:
   * - `first`: The number of items to return.
   * - `after`: The cursor to fetch items after.
   * - `before`: The cursor to fetch items before.
   * - `filters`: The filters applied to the Generations.
   * - `orderBy`: The order in which the Generations are sorted.
   * @returns A `Promise` that resolves to a `PaginatedResponse<Generation>` object containing the filtered and sorted Generations.
   */
  async getGenerations(variables: {
    first?: Maybe<number>;
    after?: Maybe<string>;
    before?: Maybe<string>;
    filters?: GenerationsFilter[];
    orderBy?: GenerationsOrderBy;
  }): Promise<PaginatedResponse<PersistedGeneration>> {
    const query = `
      query GetGenerations(
        $after: ID
        $before: ID
        $cursorAnchor: DateTime
        $filters: [generationsInputType!]
        $orderBy: GenerationsOrderByInput
        $first: Int
        $last: Int
        $projectId: String
      ) {
        generations(
          after: $after
          before: $before
          cursorAnchor: $cursorAnchor
          filters: $filters
          orderBy: $orderBy
          first: $first
          last: $last
          projectId: $projectId
        ) {
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
          totalCount
          edges {
            cursor
            node {
              id
              projectId
              prompt
              completion
              createdAt
              provider
              model
              variables
              messages
              messageCompletion
              tools
              settings
              tokenCount
              duration
              inputTokenCount
              outputTokenCount
              ttFirstToken
              tokenThroughputInSeconds
              error
              type
              tags
            }
          }
        }
      }`;

    const result = await this.makeGqlCall(query, variables);

    const response = result.data.generations;

    response.data = response.edges.map((x: any) => x.node);
    delete response.edges;

    return response;
  }

  /**
   * Creates a new generation entity and sends it to the platform.
   *
   * @param generation - The `Generation` object to be created and sent to the platform.
   * @returns A Promise resolving to the newly created `Generation` object.
   */
  async createGeneration(generation: Generation) {
    const stepId = generation.id;
    const stepMetadata = generation.metadata;
    const stepTags = generation.tags;

    delete generation.id;

    const generationAsStep = this.client.step({
      id: stepId,
      metadata: stepMetadata,
      tags: stepTags,
      generation,
      name: generation.type ?? '',
      type: 'llm'
    });

    return generationAsStep.send();
  }

  /**
   * Upserts a Thread with new information.
   *
   * @param options - The parameters to upsert a thread.
   * @param options.threadId - The unique identifier of the thread. (Required)
   * @param options.name - The name of the thread. (Optional)
   * @param options.metadata - Additional metadata for the thread as a key-value pair object. (Optional)
   * @param options.participantId - The unique identifier of the participant. (Optional)
   * @param options.tags - An array of tags associated with the thread. (Optional)
   * @returns The upserted thread object.
   */
  async upsertThread(options: {
    threadId: string;
    name?: Maybe<string>;
    metadata?: Maybe<Record<string, any>>;
    participantId?: Maybe<string>;
    tags?: Maybe<string[]>;
  }): Promise<CleanThreadFields>;

  /**
   * Upserts a Thread with new information.
   * @deprecated Use one single object attribute instead of multiple parameters.
   *
   * @param threadId - The unique identifier of the thread. (Required)
   * @param name - The name of the thread. (Optional)
   * @param metadata - Additional metadata for the thread as a key-value pair object. (Optional)
   * @param participantId - The unique identifier of the participant. (Optional)
   * @param tags - An array of tags associated with the thread. (Optional)
   * @returns The upserted thread object.
   */
  async upsertThread(
    threadId: string,
    name?: Maybe<string>,
    metadata?: Maybe<Record<string, any>>,
    participantId?: Maybe<string>,
    tags?: Maybe<string[]>
  ): Promise<CleanThreadFields>;

  async upsertThread(
    threadIdOrOptions: any,
    name?: Maybe<string>,
    metadata?: Maybe<Record<string, any>>,
    participantId?: Maybe<string>,
    tags?: Maybe<string[]>
  ): Promise<CleanThreadFields> {
    let threadId = threadIdOrOptions;
    if (typeof threadIdOrOptions === 'object') {
      threadId = threadIdOrOptions.threadId;
      name = threadIdOrOptions.name;
      metadata = threadIdOrOptions.metadata;
      participantId = threadIdOrOptions.participantId;
      tags = threadIdOrOptions.tags;
    }

    const query = `
    mutation UpsertThread(
      $threadId: String!,
      $name: String,
      $metadata: Json,
      $participantId: String,
      $tags: [String!],
    ) {
      upsertThread(
        id: $threadId
        name: $name
        metadata: $metadata
        participantId: $participantId
        tags: $tags
      ) {
        ${threadFields}
      }
    }
    `;

    const variables = {
      threadId,
      name,
      metadata,
      participantId,
      tags
    };

    const response = await this.makeGqlCall(query, variables);

    return new Thread(this.client, response.data.upsertThread);
  }

  /**
   * Retrieves a paginated list of threads (conversations) based on the provided criteria.
   *
   * @param variables - The parameters to filter and paginate the threads.
   * @param variables.first - The number of threads to retrieve after the cursor. (Optional)
   * @param variables.after - The cursor to start retrieving threads after. (Optional)
   * @param variables.before - The cursor to start retrieving threads before. (Optional)
   * @param variables.filters - The filters to apply on the threads retrieval. (Optional)
   * @param variables.orderBy - The order in which to retrieve the threads. (Optional)
   * @returns A promise that resolves to a paginated response of threads.
   */
  async getThreads(variables: {
    first?: Maybe<number>;
    after?: Maybe<string>;
    before?: Maybe<string>;
    filters?: ThreadsFilter[];
    orderBy?: ThreadsOrderBy;
    stepTypesToKeep?: StepType[];
  }): Promise<PaginatedResponse<Thread>> {
    const query = `
    query GetThreads(
        $after: ID,
        $before: ID,
        $cursorAnchor: DateTime,
        $filters: [ThreadsInputType!],
        $orderBy: ThreadsOrderByInput,
        $first: Int,
        $last: Int,
        $projectId: String,
        $stepTypesToKeep: [StepType!],
        ) {
        threads(
            after: $after,
            before: $before,
            cursorAnchor: $cursorAnchor,
            filters: $filters,
            orderBy: $orderBy,
            first: $first,
            last: $last,
            projectId: $projectId,
            stepTypesToKeep: $stepTypesToKeep,
            ) {
            pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
            }
            totalCount
            edges {
                cursor
                node {
                    ${threadFieldsWithSteps}
                }
            }
        }
    }`;

    const result = await this.makeGqlCall(query, variables);

    const response = result.data.threads;

    response.data = response.edges.map(
      (x: any) => new Thread(this.client, x.node)
    );
    delete response.edges;

    return response;
  }

  /**
   * Retrieves information from a single Thread.
   *
   * @param id - The unique identifier of the thread. This parameter is required.
   * @returns The detailed information of the specified thread.
   */
  async getThread(id: string): Promise<Maybe<Thread>> {
    const query = `
    query GetThread($id: String!) {
        threadDetail(id: $id) {
            ${threadFieldsWithSteps}
        }
    }
    `;

    const variables = { id };

    const response = await this.makeGqlCall(query, variables);
    if (!response.data.threadDetail) {
      return null;
    }

    return new Thread(this.client, response.data.threadDetail);
  }

  /**
   * Deletes a single Thread by its unique identifier.
   *
   * @param id - The unique identifier of the thread to be deleted. This parameter is required.
   * @returns The ID of the deleted thread.
   */
  async deleteThread(id: string): Promise<string> {
    const query = `
    mutation DeleteThread($threadId: String!) {
        deleteThread(id: $threadId) {
            id
        }
    }
    `;

    const variables = { threadId: id };

    const response = await this.makeGqlCall(query, variables);

    return response.data.deleteThread.id;
  }

  /**
   * Retrieves a list of users with optional filters.
   *
   * @param variables - The parameters used to filter and paginate the user list.
   * @param variables.first - Optional. The number of items to return.
   * @param variables.after - Optional. The cursor after which to start fetching data.
   * @param variables.before - Optional. The cursor before which to start fetching data.
   * @param variables.filters - Optional. Array of filters to apply to the user query.
   * @returns A `PaginatedResponse` containing a list of users without utility types.
   */
  async getUsers(variables: {
    first?: Maybe<number>;
    after?: Maybe<string>;
    before?: Maybe<string>;
    filters?: ParticipantsFilter[];
  }): Promise<PaginatedResponse<OmitUtils<User>>> {
    const query = `
    query GetParticipants(
      $after: ID,
      $before: ID,
      $cursorAnchor: DateTime,
      $filters: [participantsInputType!],
      $first: Int,
      $last: Int,
      $projectId: String,
      ) {
      participants(
          after: $after,
          before: $before,
          cursorAnchor: $cursorAnchor,
          filters: $filters,
          first: $first,
          last: $last,
          projectId: $projectId,
          ) {
          pageInfo {
              startCursor
              endCursor
              hasNextPage
              hasPreviousPage
          }
          totalCount
          edges {
              cursor
              node {
                  id
                  createdAt
                  lastEngaged
                  threadCount
                  tokenCount
                  identifier
                  metadata
              }
          }
      }
  }`;

    const result = await this.makeGqlCall(query, variables);

    const response = result.data.participants;

    response.data = response.edges.map((x: any) => new User(x.node));
    delete response.edges;

    return response;
  }

  /**
   * Creates a new user and sends it to the platform.
   *
   * @param identifier The unique identifier for the user. This parameter is required.
   * @param metadata Optional metadata for the user. This parameter is optional.
   * @returns A promise that resolves with the newly created User object.
   */
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

    const res = await this.makeGqlCall(query, variables);

    return new User({ ...res.data.createParticipant });
  }

  /**
   * Updates an existing user's details in the platform.
   *
   * @param id The unique identifier of the user to update. This parameter is required.
   * @param identifier A new identifier for the user. This parameter is optional.
   * @param metadata Additional metadata for the user. This parameter is optional.
   * @returns A promise that resolves with the updated User object.
   */
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
    const res = await this.makeGqlCall(query, variables);

    return new User({ ...res.data.updateParticipant });
  }

  /**
   * Retrieves an existing user by their identifier or creates a new one if they do not exist.
   *
   * @param identifier The unique identifier for the user. This parameter is required.
   * @param metadata Additional metadata for the user. This parameter is optional.
   * @returns The ID of the existing or newly created user.
   */
  public async getOrCreateUser(
    identifier: string,
    metadata?: Maybe<Record<string, any>>
  ) {
    const existingUser = await this.getUser(identifier);
    if (existingUser) {
      if (metadata !== undefined) {
        await this.updateUser(
          existingUser.id!,
          existingUser.identifier,
          metadata
        );
      }
      return existingUser.id!;
    } else {
      const createdUser = await this.createUser(identifier, metadata);
      return createdUser.id!;
    }
  }

  /**
   * Retrieves a user by their unique identifier.
   *
   * @param identifier The unique identifier for the user. This parameter is required.
   * @returns A `Promise` that resolves to a `User` object if found, otherwise `undefined`.
   */
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

    const res = await this.makeGqlCall(query, variables);
    if (res.data.participant) {
      return new User({ ...res.data.participant });
    }
  }

  /**
   * Deletes a single user by their unique identifier.
   *
   * @param id The unique identifier of the user to be deleted. This parameter is required.
   * @returns A `Promise` that resolves to the ID of the deleted user.
   */
  async deleteUser(id: string): Promise<string> {
    const query = `
    mutation DeleteUser($id: String!) {
        deleteParticipant(id: $id) {
            id
        }
    }
    `;

    const variables = { id };

    const result = await this.makeGqlCall(query, variables);

    return result.data.deleteParticipant.id;
  }

  /**
   * Get all scores connected to the platform.
   *
   * @param variables - The parameters for querying scores.
   * @param variables.first - Optional. The number of scores to retrieve.
   * @param variables.after - Optional. The cursor after which to start fetching scores.
   * @param variables.before - Optional. The cursor before which to start fetching scores.
   * @param variables.filters - Optional. Filters to apply to the score query.
   * @param variables.orderBy - Optional. The order in which to sort the scores.
   * @returns A `Promise` that resolves to a paginated response of scores, excluding certain utility fields.
   */
  async getScores(variables: {
    first?: Maybe<number>;
    after?: Maybe<string>;
    before?: Maybe<string>;
    filters?: ScoresFilter[];
    orderBy?: ScoresOrderBy;
  }): Promise<PaginatedResponse<OmitUtils<Score>>> {
    const query = `
    query GetScores(
      $after: ID,
      $before: ID,
      $cursorAnchor: DateTime,
      $filters: [scoresInputType!],
      $orderBy: ScoresOrderByInput,
      $first: Int,
      $last: Int,
      $projectId: String,
      ) {
      scores(
          after: $after,
          before: $before,
          cursorAnchor: $cursorAnchor,
          filters: $filters,
          orderBy: $orderBy,
          first: $first,
          last: $last,
          projectId: $projectId,
          ) {
          pageInfo {
              startCursor
              endCursor
              hasNextPage
              hasPreviousPage
          }
          totalCount
          edges {
              cursor
              node {
                  comment
                  createdAt
                  id
                  projectId
                  stepId
                  generationId
                  datasetExperimentItemId
                  type
                  updatedAt
                  name
                  value
                  tags
                  step {
                      thread {
                      id
                      participant {
                          identifier
                              }
                          }
                      }
                  }
              }
          }
      }`;

    const result = await this.makeGqlCall(query, variables);

    const response = result.data.scores;

    response.data = response.edges.map((x: any) => new Score(x.node));
    delete response.edges;

    return response;
  }

  /**
   * Creates multiple scores in the database using the provided array of scores.
   * Each score in the array is transformed into a GraphQL mutation call.
   *
   * @param scores - An array of `Score` objects to be created.
   * @returns A promise that resolves to an array of `Score` instances populated with the created scores' data.
   */
  async createScores(scores: Score[]): Promise<Score[]> {
    if (scores.some((score) => score.generationId)) {
      console.warn(
        'generationId is deprecated and will be removed in a future version, please use stepId instead'
      );
    }
    const query = createScoresQueryBuilder(scores);
    const variables = variablesBuilder(scores);

    const result = await this.makeGqlCall(query, variables);
    return Object.values(result.data).map((x: any) => new Score(x));
  }

  /**
   * Creates a new score in the database using the provided parameters.
   *
   * @param variables - The score details to be used in the creation process. This includes:
   * @param variables.name - The name of the score. (required)
   * @param variables.type - The type of the score, based on the `ScoreType` enum. (required)
   * @param variables.value - The numeric value of the score. (required)
   * @param variables.stepId - The identifier for the step associated with the score. (optional)
   * @param variables.generationId - The identifier for the generation associated with the score. (optional)
   * @param variables.datasetExperimentItemId - The identifier for the dataset experiment item associated with the score. (optional)
   * @param variables.comment - Any comment associated with the score. (optional)
   * @param variables.tags - An array of tags associated with the score. (required)
   * @returns A new `Score` instance populated with the created score's data.
   */
  async createScore(variables: OmitUtils<Score>) {
    const query = `
    mutation CreateScore(
      $name: String!,
      $type: ScoreType!,
      $value: Float!,
      $stepId: String,
      $generationId: String,
      $datasetExperimentItemId: String,
      $scorer: String,
      $comment: String,
      $tags: [String!],
  ) {
      createScore(
          name: $name,
          type: $type,
          value: $value,
          stepId: $stepId,
          generationId: $generationId,
          datasetExperimentItemId: $datasetExperimentItemId,
          scorer: $scorer,
          comment: $comment,
          tags: $tags,
      ) {
          id
          name,
          type,
          value,
          stepId,
          generationId,
          datasetExperimentItemId,
          scorer,
          comment,
          tags,
      }
  }
    `;
    if (variables.generationId) {
      console.warn(
        'generationId is deprecated and will be removed in a future version, please use stepId instead'
      );
    }
    const result = await this.makeGqlCall(query, variables);
    return new Score(result.data.createScore);
  }

  /**
   * Updates an existing score in the database.
   *
   * @param id - The unique identifier of the score to update. (required)
   * @param updateParams - The parameters to update in the score. (required)
   * @param updateParams.comment - A new or updated comment for the score. (optional)
   * @param updateParams.value - The new value to set for the score. (required)
   * @returns A `Score` instance representing the updated score.
   */
  async updateScore(
    id: string,
    updateParams: {
      comment?: Maybe<string>;
      value: number;
    }
  ) {
    const query = `
    mutation UpdateScore(
      $id: String!,
      $comment: String,
      $value: Float!,
  ) {
      updateScore(
          id: $id,
          comment: $comment,
          value: $value,
      ) {
          id
          name,
          type,
          value,
          stepId,
          generationId,
          datasetExperimentItemId,
          comment
      }
  }
    `;

    const variables = { id, ...updateParams };
    const result = await this.makeGqlCall(query, variables);
    return new Score(result.data.updateScore);
  }

  /**
   * Deletes a single score from the database.
   *
   * @param id - The unique identifier of the score to delete. (required)
   * @returns The ID of the deleted score.
   */
  async deleteScore(id: string) {
    const query = `
    mutation DeleteScore($id: String!) {
      deleteScore(id: $id) {
          id
      }
  }
    `;

    const variables = { id };
    const result = await this.makeGqlCall(query, variables);
    return result.data.deleteScore;
  }

  /**
   * List all datasets in the platform.
   *
   * @returns The names and ids of all datasets.
   */
  public async getDatasets(): Promise<{ id: string; name: string }[]> {
    const query = `query GetDatasets ($after: ID) {
      datasets(
        after: $after
        first: 100
      ) {
        edges {
          node {
            id
            name
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }`;

    const items: { id: string; name: string }[] = [];

    let cursor = null;
    do {
      const result = await this.makeGqlCall(query, { after: cursor });
      const { pageInfo, edges } = result.data.datasets;
      cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
      items.push(...edges.map((edge: any) => edge.node));
    } while (cursor);

    return items;
  }

  /**
   * Creates a new dataset in the database.
   *
   * @param dataset - The dataset details to be created.
   * @param dataset.name - The name of the dataset. (required)
   * @param dataset.description - The description of the dataset. (optional)
   * @param dataset.metadata - Additional metadata for the dataset as a key-value pair object. (optional)
   * @param dataset.type - The type of the dataset, defined by the DatasetType enum. (optional)
   * @returns A new Dataset instance populated with the created dataset's data.
   */
  public async createDataset(dataset: {
    name: string;
    description?: Maybe<string>;
    metadata?: Maybe<Record<string, any>>;
    type?: DatasetType;
  }) {
    const query = `
      mutation CreateDataset($name: String!, $description: String, $metadata: Json, $type: DatasetType) {
        createDataset(name: $name, description: $description, metadata: $metadata, type: $type) {
          id
          createdAt
          metadata
          name
          description
          type
        }
      }
    `;
    const result = await this.makeGqlCall(query, dataset);

    return new Dataset(this, result.data.createDataset);
  }

  /**
   * Retrieves a dataset based on provided ID or name.
   *
   * @param variables - An object containing optional `id` and `name` properties to specify which dataset to retrieve.
   * @returns A `Dataset` instance populated with the retrieved dataset's data, or `null` if no data is found.
   */
  public async getDataset(variables: { id?: string; name?: string }) {
    const result = await this.makeApiCall('/export/dataset', variables);

    if (!result.data) {
      return null;
    }

    return new Dataset(this, result.data);
  }

  /**
   * Updates a dataset with new information.
   *
   * @param id - The unique identifier of the dataset to update. This parameter is required.
   * @param dataset - An object containing the new dataset information.
   * @param dataset.name - The new name of the dataset. (optional)
   * @param dataset.description - The new description of the dataset. (optional)
   * @param dataset.metadata - Additional metadata for the dataset as a key-value pair object. (optional)
   * @returns A new `Dataset` instance populated with the updated dataset's data.
   */
  public async updateDataset(
    id: string,
    dataset: {
      name?: Maybe<string>;
      description?: Maybe<string>;
      metadata?: Maybe<Record<string, any>>;
    }
  ) {
    const query = `
      mutation UpdadeDataset($id: String!, $name: String, $description: String, $metadata: Json) {
        updateDataset(id: $id, name: $name, description: $description, metadata: $metadata) {
          id
          createdAt
          metadata
          name
          description
          type
        }
      }
    `;
    const result = await this.makeGqlCall(query, { id, ...dataset });

    return new Dataset(this, result.data.updateDataset);
  }

  /**
   * Deletes a single dataset by its unique identifier.
   *
   * @param id - The unique identifier of the dataset to delete. This parameter is required.
   * @returns A new `Dataset` instance populated with the deleted dataset's data.
   */
  public async deleteDataset(id: string) {
    const query = `
      mutation DeleteDataset($id: String!) {
        deleteDataset(id: $id) {
          id
          createdAt
          metadata
          name
          description
          type
        }
      }
    `;
    const result = await this.makeGqlCall(query, { id });

    return new Dataset(this, result.data.deleteDataset);
  }

  /**
   * Creates a new item in a dataset.
   *
   * @param datasetId - The unique identifier of the dataset. This parameter is required.
   * @param datasetItem - The data for the new dataset item. This parameter is required.
   * @param datasetItem.input - The input data for the dataset item. This field is required.
   * @param datasetItem.expectedOutput - The expected output data for the dataset item. This field is optional.
   * @param datasetItem.metadata - Additional metadata for the dataset item. This field is optional.
   * @returns A new `DatasetItem` instance populated with the created dataset item's data.
   */
  public async createDatasetItem(
    datasetId: string,
    datasetItem: {
      input: Record<string, any>;
      expectedOutput?: Maybe<Record<string, any>>;
      metadata?: Maybe<Record<string, any>>;
    }
  ) {
    const query = `
      mutation CreateDatasetItem($datasetId: String!, $input: Json!, $expectedOutput: Json, $metadata: Json) {
        createDatasetItem(datasetId: $datasetId, input: $input, expectedOutput: $expectedOutput, metadata: $metadata) {
          id
          createdAt
          datasetId
          metadata
          input
          expectedOutput
          intermediarySteps
          stepId
        }
      }
    `;
    const result = await this.makeGqlCall(query, { datasetId, ...datasetItem });

    return new DatasetItem(result.data.createDatasetItem);
  }

  /**
   * Retrieves a single item from a dataset by its unique identifier.
   *
   * @param id - The unique identifier of the dataset item. This parameter is required.
   * @returns A `DatasetItem` instance populated with the retrieved dataset item's data.
   */
  public async getDatasetItem(id: string) {
    const query = `
      query GetDatasetItem($id: String!) {
        datasetItem(id: $id) {
          id
          createdAt
          datasetId
          metadata
          input
          expectedOutput
          intermediarySteps
          stepId
        }
      }
    `;
    const result = await this.makeGqlCall(query, { id });

    return new DatasetItem(result.data.datasetItem);
  }

  /**
   * Deletes a single item from a dataset by its unique identifier.
   *
   * @param id - The unique identifier of the dataset item to be deleted. This parameter is required.
   * @returns A `DatasetItem` instance populated with the data of the deleted dataset item.
   */
  public async deleteDatasetItem(id: string) {
    const query = `
      mutation DeleteDatasetItem($id: String!) {
        deleteDatasetItem(id: $id) {
          id
          createdAt
          datasetId
          metadata
          input
          expectedOutput
          intermediarySteps
          stepId
        }
      }
    `;
    const result = await this.makeGqlCall(query, { id });

    return new DatasetItem(result.data.deleteDatasetItem);
  }

  /**
   * Adds a single step item to a dataset.
   *
   * @param datasetId - The unique identifier of the dataset. This parameter is required.
   * @param stepId - The unique identifier of the step to be added. This parameter is required.
   * @param metadata - Additional metadata for the step as a JSON object. This parameter is optional.
   * @returns A `DatasetItem` instance populated with the data of the newly added step.
   */
  public async addStepToDataset(
    datasetId: string,
    stepId: string,
    metadata?: Maybe<Record<string, unknown>>
  ) {
    const query = `
     mutation AddStepToDataset($datasetId: String!, $stepId: String!, $metadata: Json) {
      addStepToDataset(datasetId: $datasetId, stepId: $stepId, metadata: $metadata) {
          id
          createdAt
          datasetId
          metadata
          input
          expectedOutput
          intermediarySteps
          stepId
        }
      }
    `;
    const result = await this.makeGqlCall(query, {
      datasetId,
      stepId,
      metadata
    });

    return new DatasetItem(result.data.addStepToDataset);
  }

  /**
   * Adds a generation item to a dataset.
   *
   * @param datasetId - The unique identifier of the dataset. This parameter is required.
   * @param generationId - The unique identifier of the generation to be added. This parameter is required.
   * @param metadata - Additional metadata for the generation as a JSON object. This parameter is optional.
   * @returns A `DatasetItem` instance populated with the data of the newly added generation.
   */
  public async addGenerationToDataset(
    datasetId: string,
    generationId: string,
    metadata?: Maybe<Record<string, unknown>>
  ) {
    const query = `
     mutation AddGenerationToDataset($datasetId: String!, $generationId: String!, $metadata: Json) {
      addGenerationToDataset(datasetId: $datasetId, generationId: $generationId, metadata: $metadata) {
          id
          createdAt
          datasetId
          metadata
          input
          expectedOutput
          intermediarySteps
          stepId
        }
      }
    `;
    const result = await this.makeGqlCall(query, {
      datasetId,
      generationId,
      metadata
    });

    return new DatasetItem(result.data.addGenerationToDataset);
  }

  /**
   * Adds multiple generation items to a dataset.
   *
   * @param datasetId - The unique identifier of the dataset. This parameter is required.
   * @param generationIds - An array of unique identifiers for the generations to be added. This parameter is required.
   * @returns An array of `DatasetItem` instances populated with the data of the newly added generations
   */
  public async addGenerationsToDataset(
    datasetId: string,
    generationIds: string[]
  ): Promise<DatasetItem[]> {
    const query = addGenerationsToDatasetQueryBuilder(generationIds);
    const variables = generationsVariablesBuilder(datasetId, generationIds);

    const result = await this.makeGqlCall(query, variables);
    return Object.values(result.data).map((x: any) => new DatasetItem(x));
  }

  /**
   * Creates a prompt variation for an experiment.
   * This variation is not an official version until manually saved.
   *
   * @param name The name of the prompt to retrieve or create.
   * @param templateMessages A list of template messages for the prompt.
   * @param settings Optional settings for the prompt.
   * @param tools Optional tools for the prompt.
   * @returns The prompt variant id to link with the experiment.
   */
  public async createPromptVariant(
    name: string,
    templateMessages: IGenerationMessage[],
    settings?: Maybe<Record<string, any>>,
    tools?: Maybe<Record<string, any>>
  ): Promise<string | undefined> {
    const mutation = `mutation createPromptExperiment(
        $fromLineageId: String
        $fromVersion: Int
        $scoreTemplateId: String
        $templateMessages: Json
        $settings: Json
        $tools: Json
        $variables: Json
      ) {
        createPromptExperiment(
          fromLineageId: $fromLineageId
          fromVersion: $fromVersion
          scoreTemplateId: $scoreTemplateId
          templateMessages: $templateMessages
          settings: $settings
          tools: $tools
          variables: $variables
        ) {
          id
          fromLineageId
          fromVersion
          scoreTemplateId
          projectId
          projectUserId
          tools
          settings
          variables
          templateMessages
        }
      }
    `;

    const lineage = await this.getPromptLineageByName(name);
    const result = await this.makeGqlCall(mutation, {
      fromLineageId: lineage?.id,
      templateMessages,
      settings,
      tools
    });

    return result.data.createPromptExperiment?.id;
  }

  /**
   * Creates a new dataset experiment.
   * @param datasetExperiment
   * @param datasetExperiment.name The name of the dataset experiment.
   * @param datasetExperiment.datasetId The dataset ID to associate with the experiment.
   * @param datasetExperiment.promptId The prompt ID to associate with the experiment.
   * @param datasetExperiment.params The parameters for the experiment as a key-value pair object or an array of the same.
   * @returns The newly created dataset experiment object.
   */
  public async createExperiment(datasetExperiment: {
    name: string;
    datasetId?: string;
    promptVariantId?: string;
    params?: Record<string, any> | Array<Record<string, any>>;
  }) {
    const query = `
      mutation CreateDatasetExperiment($name: String!, $datasetId: String, $promptExperimentId: String, $params: Json) {
        createDatasetExperiment(name: $name, datasetId: $datasetId, promptExperimentId: $promptExperimentId, params: $params) {
          id
        }
      }
    `;
    const datasetExperimentInput = {
      name: datasetExperiment.name,
      datasetId: datasetExperiment.datasetId,
      promptExperimentId: datasetExperiment.promptVariantId,
      params: datasetExperiment.params
    };
    const result = await this.makeGqlCall(query, datasetExperimentInput);

    return new DatasetExperiment(this, result.data.createDatasetExperiment);
  }

  /**
   * Creates a new dataset experiment item.
   *
   * @param parameters
   * @param parameters.datasetExperimentId The dataset experiment ID to associate with the item (required)
   * @param parameters.scores An array of scores to associate with the item (required)
   * @param parameters.datasetItemId The ID of the dataset item (optional)
   * @param parameters.experimentRunId The ID of the experiment run (optional)
   * @param parameters.input The input data for the item (optional)
   * @param parameters.output The output data for the item (optional)
   * @returns The dataset experiment object.
   */
  public async createExperimentItem({
    datasetExperimentId,
    datasetItemId,
    experimentRunId,
    input,
    output,
    scores
  }: DatasetExperimentItem) {
    const query = `
      mutation CreateDatasetExperimentItem($datasetExperimentId: String!, $datasetItemId: String, $experimentRunId: String, $input: Json, $output: Json) {
        createDatasetExperimentItem(datasetExperimentId: $datasetExperimentId, datasetItemId: $datasetItemId, experimentRunId: $experimentRunId, input: $input, output: $output) {
          id
          input
          output
          experimentRunId
        }
      }
    `;

    const result = await this.makeGqlCall(query, {
      datasetExperimentId,
      datasetItemId,
      experimentRunId,
      input,
      output
    });

    const createdScores = await this.createScores(
      scores.map((score) => {
        score.datasetExperimentItemId =
          result.data.createDatasetExperimentItem.id;
        return new Score(score);
      })
    );

    return new DatasetExperimentItem({
      ...result.data.createDatasetExperimentItem,
      createdScores
    });
  }

  /**
   * Create a new prompt lineage.
   *
   * @param name - The name of the prompt lineage. This parameter is required.
   * @param description - A description for the prompt lineage. This parameter is optional.
   * @returns The newly created prompt lineage object, or null if creation failed.
   */
  public async createPromptLineage(name: string, description?: string) {
    const mutation = `mutation createPromptLineage(
      $name: String!
      $description: String
    ) {
      createPromptLineage(
        name: $name
        description: $description
      ) {
        id
        name
      }
    }`;

    const result = await this.makeGqlCall(mutation, {
      name,
      description
    });

    if (!result.data || !result.data.createPromptLineage) {
      return null;
    }

    return result.data.createPromptLineage;
  }

  /**
   * Get an existing prompt lineage by name.
   *
   * @param name - The name of the prompt lineage. This parameter is required.
   * @returns The existing prompt lineage object, or null.
   */
  public async getPromptLineageByName(name: string) {
    const query = `query promptLineage(
        $name: String!
      ) {
        promptLineage(
          name: $name
        ) {
          id
        }
      }`;

    const result = await this.makeGqlCall(query, {
      name
    });

    if (!result.data || !result.data.promptLineage) {
      return null;
    }

    return result.data.promptLineage;
  }

  /**
   * @deprecated Please use getOrCreatePrompt instead.
   */
  public async createPrompt(
    name: string,
    templateMessages: IGenerationMessage[],
    settings?: Maybe<Record<string, any>>
  ) {
    return this.getOrCreatePrompt(name, templateMessages, settings);
  }

  /**
   * A Prompt is fully defined by its name, template_messages, settings
   * and tools.
   * If a prompt already exists for the given arguments, it is returned.
   * Otherwise, a new prompt is created.
   *
   * @param name The name of the prompt to retrieve or create.
   * @param templateMessages A list of template messages for the prompt.
   * @param settings Optional settings for the prompt.
   * @param tools Optional tools for the prompt.
   * @returns The prompt that was retrieved or created.
   */
  public async getOrCreatePrompt(
    name: string,
    templateMessages: IGenerationMessage[],
    settings?: Maybe<Record<string, any>>,
    tools?: Maybe<Record<string, any>>
  ) {
    const mutation = `mutation createPromptVersion(
      $lineageId: String!
      $versionDesc: String
      $templateMessages: Json
      $tools: Json
      $settings: Json
      $variables: Json
      $variablesDefaultValues: Json
    ) {
      createPromptVersion(
        lineageId: $lineageId
        versionDesc: $versionDesc
        templateMessages: $templateMessages
        tools: $tools
        settings: $settings
        variables: $variables
        variablesDefaultValues: $variablesDefaultValues
      ) {
        id
        version
        createdAt
        tools
        settings
        templateMessages
      }
    }`;

    const lineage = await this.createPromptLineage(name);
    const result = await this.makeGqlCall(mutation, {
      lineageId: lineage.id,
      templateMessages,
      settings,
      tools
    });

    const promptData = result.data.createPromptVersion;
    promptData.provider = promptData.settings?.provider;
    promptData.name = name;
    delete promptData.lineage;
    if (promptData.settings) {
      delete promptData.settings.provider;
    }

    return new Prompt(this, promptData);
  }

  /**
   * Retrieves a prompt by its id. If the request fails, it will try to get the prompt from the cache.
   *
   * @param id ID of the prompt to retrieve.
   * @returns The prompt with given ID.
   */
  public async getPromptById(id: string) {
    try {
      const query = `
      query GetPrompt($id: String!) {
        promptVersion(id: $id) {
          createdAt
          id
          label
          settings
          status
          tags
          templateMessages
          tools
          type
          updatedAt
          url
          variables
          variablesDefaultValues
          version
          lineage {
            name
          }
        }
      }
      `;

      const prompt = await this.getPromptWithQuery(query, { id });
      if (prompt) {
        await this.promptCache.put(prompt);
        return prompt;
      }
      return null;
    } catch (error) {
      console.warn(
        `Failed to get prompt from DB, trying cache. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return await this.promptCache.get({ id });
    }
  }

  /**
   * Retrieves a prompt by its name and optionally by its version. If the request fails, it will try to get the prompt from the cache.
   *
   * @param name - The name of the prompt to retrieve.
   * @param version - The version number of the prompt (optional).
   * @returns An instance of `Prompt` containing the prompt data, or `null` if not found.
   */
  public async getPrompt(name: string, version?: number) {
    try {
      const query = `
      query GetPrompt($name: String!, $version: Int) {
        promptVersion(name: $name, version: $version) {
          id
          createdAt
          updatedAt
          type
          templateMessages
          tools
          settings
          variables
          variablesDefaultValues
          version
          url
          lineage {
            name
          }
        }
      }
      `;
      const prompt = await this.getPromptWithQuery(query, { name, version });
      if (prompt) {
        await this.promptCache.put(prompt);
        return prompt;
      }
      return null;
    } catch (error) {
      console.warn(
        `Failed to get prompt from DB, trying cache. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return await this.promptCache.get({ name, version });
    }
  }

  private async getPromptWithQuery(
    query: string,
    variables: Record<string, any>
  ) {
    const result = await this.makeGqlCall(query, variables);

    if (!result.data || !result.data.promptVersion) {
      return null;
    }

    const promptData = result.data.promptVersion;
    promptData.provider = promptData.settings?.provider;
    promptData.name = promptData.lineage?.name;
    delete promptData.lineage;
    if (promptData.settings) {
      delete promptData.settings.provider;
    }

    return new Prompt(this, promptData);
  }

  /**
   * Retrieves a prompt A/B testing rollout by its name.
   *
   * @param name - The name of the prompt to retrieve.
   * @returns A list of prompt rollout versions.
   */
  public async getPromptAbTesting(
    name: string
  ): Promise<IPromptRollout[] | null> {
    const query = `
   query getPromptLineageRollout($projectId: String, $lineageName: String!) {
    promptLineageRollout(projectId: $projectId, lineageName: $lineageName) {
      pageInfo {
        startCursor
        endCursor
      }
      edges {
        node {
          version
          rollout
        }
      }
    }
  }
   `;

    const variables = { lineageName: name };
    const result = await this.makeGqlCall(query, variables);

    if (!result.data || !result.data.promptLineageRollout) {
      return null;
    }

    const response = result.data.promptLineageRollout;

    return response.edges.map((x: any) => x.node);
  }

  /**
   * Update a prompt A/B testing rollout by its name.
   *
   * @param name - The name of the prompt to retrieve.
   * @param rollouts - A list of prompt rollout versions.
   * @returns A list of prompt rollout versions.
   */
  public async updatePromptAbTesting(name: string, rollouts: IPromptRollout[]) {
    const mutation = `
      mutation updatePromptLineageRollout(
        $projectId: String
        $name: String!
        $rollouts: [PromptVersionRolloutInput!]!
      ) {
        updatePromptLineageRollout(
          projectId: $projectId
          name: $name
          rollouts: $rollouts
        ) {
          ok
          message
          errorCode
        }
      }
     `;

    const variables = { name: name, rollouts };
    const result = await this.makeGqlCall(mutation, variables);

    if (!result.data || !result.data.updatePromptLineageRollout) {
      return null;
    }

    return result.data.promptLineageRollout;
  }
}
