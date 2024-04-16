**@literalai/client**

***

# @literalai/client

## Classes

### API

#### Methods

##### makeGqlCall()

> **`private`** **makeGqlCall**(`query`, `variables`): `Promise`\<`any`\>

Executes a GraphQL call using the provided query and variables.

###### Parameters

▪ **query**: `string`

The GraphQL query string to be executed.

▪ **variables**: `any`

The variables object for the GraphQL query.

###### Returns

`Promise`\<`any`\>

The data part of the response from the GraphQL endpoint.

###### Throws

Will throw an error if the GraphQL call returns errors or if the request fails.

##### makeApiCall()

> **`private`** **makeApiCall**(`subpath`, `body`): `Promise`\<`any`\>

Executes a REST API call to the specified subpath with the provided body.

###### Parameters

▪ **subpath**: `string`

The subpath of the REST endpoint to which the request is made.

▪ **body**: `any`

The body of the POST request.

###### Returns

`Promise`\<`any`\>

The data part of the response from the REST endpoint.

###### Throws

Will throw an error if the request fails or if the response contains errors.

##### sendSteps()

> **sendSteps**(`steps`): `Promise`\<`any`\>

Sends a collection of steps to the GraphQL endpoint.

This method constructs a GraphQL query using the provided steps, then executes the query.

###### Parameters

▪ **steps**: `Step`[]

An array of Step objects to be sent.

###### Returns

`Promise`\<`any`\>

The response from the GraphQL call.

##### getStep()

> **getStep**(`id`): `Promise`\<`Maybe`\<`Step`\>\>

Retrieves a step by its ID.

This method constructs a GraphQL query to fetch a step by its unique identifier.
It then executes the query and returns the step if found.

###### Parameters

▪ **id**: `string`

The unique identifier of the step to retrieve.

###### Returns

`Promise`\<`Maybe`\<`Step`\>\>

A `Promise` that resolves to the step if found, or `null` if not found.

##### deleteStep()

> **deleteStep**(`id`): `Promise`\<`string`\>

Deletes a Step from the platform by its unique identifier.

This method constructs a GraphQL mutation to delete a step by its unique identifier.
It then executes the mutation and returns the ID of the deleted step.

###### Parameters

▪ **id**: `string`

The unique identifier of the step to delete.

###### Returns

`Promise`\<`string`\>

A `Promise` that resolves to the ID of the deleted step.

##### uploadFile()

> **uploadFile**(`params`): `Promise`\<`object`\>

Uploads a file to a specified thread. This method supports uploading either through direct content or via a file path.
It first signs the upload through a pre-configured endpoint and then proceeds to upload the file using the signed URL.

###### Parameters

▪ **params**: `object`

The parameters for uploading a file, including:

▪ **params.content?**: `any`

The content of the file to upload. Optional if `path` is provided.

▪ **params.path?**: `Maybe`\<`string`\>

The path to the file to upload. Optional if `content` is provided.

▪ **params.id?**: `Maybe`\<`string`\>

The unique identifier for the file. If not provided, a UUID will be generated.

▪ **params.threadId**: `string`

The unique identifier of the thread to which the file is being uploaded.

▪ **params.mime?**: `Maybe`\<`string`\>

The MIME type of the file. Defaults to 'application/octet-stream' if not provided.

###### Returns

`Promise`\<`object`\>

An object containing the `objectKey` of the uploaded file and the signed `url`, or `null` values if the upload fails.

###### Throws

Throws an error if neither `content` nor `path` is provided, or if the server response is invalid.

##### getGenerations()

> **getGenerations**(`variables`): `Promise`\<`PaginatedResponse`\<`Generation`\>\>

Retrieves a paginated list of Generations based on the provided filters and sorting order.

###### Parameters

▪ **variables**: `object`

The variables to filter and sort the Generations. It includes:
- `first`: The number of items to return.
- `after`: The cursor to fetch items after.
- `before`: The cursor to fetch items before.
- `filters`: The filters applied to the Generations.
- `orderBy`: The order in which the Generations are sorted.

▪ **variables.first?**: `Maybe`\<`number`\>

▪ **variables.after?**: `Maybe`\<`string`\>

▪ **variables.before?**: `Maybe`\<`string`\>

▪ **variables.filters?**: `GenerationsFilter`[]

▪ **variables.orderBy?**: `GenerationsOrderBy`

###### Returns

`Promise`\<`PaginatedResponse`\<`Generation`\>\>

A `Promise` that resolves to a `PaginatedResponse<Generation>` object containing the filtered and sorted Generations.

##### createGeneration()

> **createGeneration**(`generation`): `Promise`\<`Generation`\>

Creates a new generation entity and sends it to the platform.

###### Parameters

▪ **generation**: `Generation`

The `Generation` object to be created and sent to the platform.

###### Returns

`Promise`\<`Generation`\>

A Promise resolving to the newly created `Generation` object.

##### upsertThread()

> **upsertThread**(`threadId`, `name`?, `metadata`?, `participantId`?, `environment`?, `tags`?): `Promise`\<`any`\>

Upserts a Thread with new information.

###### Parameters

▪ **threadId**: `string`

The unique identifier of the thread. (Required)

▪ **name?**: `Maybe`\<`string`\>

The name of the thread. (Optional)

▪ **metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Additional metadata for the thread as a key-value pair object. (Optional)

▪ **participantId?**: `Maybe`\<`string`\>

The unique identifier of the participant. (Optional)

▪ **environment?**: `Maybe`\<`string`\>

The environment where the thread is being upserted. (Optional)

▪ **tags?**: `Maybe`\<`string`[]\>

An array of tags associated with the thread. (Optional)

###### Returns

`Promise`\<`any`\>

The upserted thread object.

##### getThreads()

> **getThreads**(`variables`): `Promise`\<`PaginatedResponse`\<`CleanThreadFields`\>\>

Retrieves a paginated list of threads (conversations) based on the provided criteria.

###### Parameters

▪ **variables**: `object`

The parameters to filter and paginate the threads.

▪ **variables.first?**: `Maybe`\<`number`\>

The number of threads to retrieve after the cursor. (Optional)

▪ **variables.after?**: `Maybe`\<`string`\>

The cursor to start retrieving threads after. (Optional)

▪ **variables.before?**: `Maybe`\<`string`\>

The cursor to start retrieving threads before. (Optional)

▪ **variables.filters?**: `ThreadsFilter`[]

The filters to apply on the threads retrieval. (Optional)

▪ **variables.orderBy?**: `ThreadsOrderBy`

The order in which to retrieve the threads. (Optional)

###### Returns

`Promise`\<`PaginatedResponse`\<`CleanThreadFields`\>\>

A promise that resolves to a paginated response of threads.

##### getThread()

> **getThread**(`id`): `Promise`\<`any`\>

Retrieves information from a single Thread.

###### Parameters

▪ **id**: `string`

The unique identifier of the thread. This parameter is required.

###### Returns

`Promise`\<`any`\>

The detailed information of the specified thread.

##### deleteThread()

> **deleteThread**(`id`): `Promise`\<`any`\>

Deletes a single Thread by its unique identifier.

###### Parameters

▪ **id**: `string`

The unique identifier of the thread to be deleted. This parameter is required.

###### Returns

`Promise`\<`any`\>

The ID of the deleted thread.

##### getUsers()

> **getUsers**(`variables`): `Promise`\<`PaginatedResponse`\<`OmitUtils`\<`User`\>\>\>

Retrieves a list of users with optional filters.

###### Parameters

▪ **variables**: `object`

The parameters used to filter and paginate the user list.

▪ **variables.first?**: `Maybe`\<`number`\>

Optional. The number of items to return.

▪ **variables.after?**: `Maybe`\<`string`\>

Optional. The cursor after which to start fetching data.

▪ **variables.before?**: `Maybe`\<`string`\>

Optional. The cursor before which to start fetching data.

▪ **variables.filters?**: `ParticipantsFilter`[]

Optional. Array of filters to apply to the user query.

###### Returns

`Promise`\<`PaginatedResponse`\<`OmitUtils`\<`User`\>\>\>

A `PaginatedResponse` containing a list of users without utility types.

##### createUser()

> **createUser**(`identifier`, `metadata`?): `Promise`\<`User`\>

Creates a new user and sends it to the platform.

###### Parameters

▪ **identifier**: `string`

The unique identifier for the user. This parameter is required.

▪ **metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Optional metadata for the user. This parameter is optional.

###### Returns

`Promise`\<`User`\>

A promise that resolves with the newly created User object.

##### updateUser()

> **updateUser**(`id`, `identifier`?, `metadata`?): `Promise`\<`User`\>

Updates an existing user's details in the platform.

###### Parameters

▪ **id**: `string`

The unique identifier of the user to update. This parameter is required.

▪ **identifier?**: `string`

A new identifier for the user. This parameter is optional.

▪ **metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Additional metadata for the user. This parameter is optional.

###### Returns

`Promise`\<`User`\>

A promise that resolves with the updated User object.

##### getOrCreateUser()

> **getOrCreateUser**(`identifier`, `metadata`?): `Promise`\<`string`\>

Retrieves an existing user by their identifier or creates a new one if they do not exist.

###### Parameters

▪ **identifier**: `string`

The unique identifier for the user. This parameter is required.

▪ **metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Additional metadata for the user. This parameter is optional.

###### Returns

`Promise`\<`string`\>

The ID of the existing or newly created user.

##### getUser()

> **getUser**(`identifier`): `Promise`\<`Maybe`\<`User`\>\>

Retrieves a user by their unique identifier.

###### Parameters

▪ **identifier**: `string`

The unique identifier for the user. This parameter is required.

###### Returns

`Promise`\<`Maybe`\<`User`\>\>

A `Promise` that resolves to a `User` object if found, otherwise `undefined`.

##### deleteUser()

> **deleteUser**(`id`): `Promise`\<`string`\>

Deletes a single user by their unique identifier.

###### Parameters

▪ **id**: `string`

The unique identifier of the user to be deleted. This parameter is required.

###### Returns

`Promise`\<`string`\>

A `Promise` that resolves to the ID of the deleted user.

##### getScores()

> **getScores**(`variables`): `Promise`\<`PaginatedResponse`\<`OmitUtils`\<`Score`\>\>\>

Get all scores connected to the platform.

###### Parameters

▪ **variables**: `object`

The parameters for querying scores.

▪ **variables.first?**: `Maybe`\<`number`\>

Optional. The number of scores to retrieve.

▪ **variables.after?**: `Maybe`\<`string`\>

Optional. The cursor after which to start fetching scores.

▪ **variables.before?**: `Maybe`\<`string`\>

Optional. The cursor before which to start fetching scores.

▪ **variables.filters?**: `ScoresFilter`[]

Optional. Filters to apply to the score query.

▪ **variables.orderBy?**: `ScoresOrderBy`

Optional. The order in which to sort the scores.

###### Returns

`Promise`\<`PaginatedResponse`\<`OmitUtils`\<`Score`\>\>\>

A `Promise` that resolves to a paginated response of scores, excluding certain utility fields.

##### createScore()

> **createScore**(`variables`): `Promise`\<`Score`\>

Creates a new score in the database using the provided parameters.

###### Parameters

▪ **variables**: `OmitUtils`\<`Score`\>

The score details to be used in the creation process. This includes:

###### Returns

`Promise`\<`Score`\>

A new `Score` instance populated with the created score's data.

##### updateScore()

> **updateScore**(`id`, `updateParams`): `Promise`\<`Score`\>

Updates an existing score in the database.

###### Parameters

▪ **id**: `string`

The unique identifier of the score to update. (required)

▪ **updateParams**: `object`

The parameters to update in the score. (required)

▪ **updateParams.comment?**: `Maybe`\<`string`\>

A new or updated comment for the score. (optional)

▪ **updateParams.value**: `number`

The new value to set for the score. (required)

###### Returns

`Promise`\<`Score`\>

A `Score` instance representing the updated score.

##### deleteScore()

> **deleteScore**(`id`): `Promise`\<`any`\>

Deletes a single score from the database.

###### Parameters

▪ **id**: `string`

The unique identifier of the score to delete. (required)

###### Returns

`Promise`\<`any`\>

The ID of the deleted score.

##### createDataset()

> **createDataset**(`dataset`): `Promise`\<`Dataset`\>

Creates a new dataset in the database.

###### Parameters

▪ **dataset**: `object`

The dataset details to be created.

▪ **dataset.name**: `string`

The name of the dataset. (required)

▪ **dataset.description?**: `Maybe`\<`string`\>

The description of the dataset. (optional)

▪ **dataset.metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Additional metadata for the dataset as a key-value pair object. (optional)

▪ **dataset.type?**: `DatasetType`

The type of the dataset, defined by the DatasetType enum. (optional)

###### Returns

`Promise`\<`Dataset`\>

A new Dataset instance populated with the created dataset's data.

##### getDataset()

> **getDataset**(`id`): `Promise`\<`null` \| `Dataset`\>

Retrieves a dataset by its unique identifier.

###### Parameters

▪ **id**: `string`

The unique identifier of the dataset to retrieve. This parameter is required.

###### Returns

`Promise`\<`null` \| `Dataset`\>

An instance of `Dataset` populated with the dataset's data, or `null` if no dataset is found.

##### updateDataset()

> **updateDataset**(`id`, `dataset`): `Promise`\<`Dataset`\>

Updates a dataset with new information.

###### Parameters

▪ **id**: `string`

The unique identifier of the dataset to update. This parameter is required.

▪ **dataset**: `object`

An object containing the new dataset information.

▪ **dataset.name?**: `Maybe`\<`string`\>

The new name of the dataset. (optional)

▪ **dataset.description?**: `Maybe`\<`string`\>

The new description of the dataset. (optional)

▪ **dataset.metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Additional metadata for the dataset as a key-value pair object. (optional)

###### Returns

`Promise`\<`Dataset`\>

A new `Dataset` instance populated with the updated dataset's data.

##### deleteDataset()

> **deleteDataset**(`id`): `Promise`\<`Dataset`\>

Deletes a single dataset by its unique identifier.

###### Parameters

▪ **id**: `string`

The unique identifier of the dataset to delete. This parameter is required.

###### Returns

`Promise`\<`Dataset`\>

A new `Dataset` instance populated with the deleted dataset's data.

##### createDatasetItem()

> **createDatasetItem**(`datasetId`, `datasetItem`): `Promise`\<`DatasetItem`\>

Creates a new item in a dataset.

###### Parameters

▪ **datasetId**: `string`

The unique identifier of the dataset. This parameter is required.

▪ **datasetItem**: `object`

The data for the new dataset item. This parameter is required.

▪ **datasetItem.input**: `Record`\<`string`, `any`\>

The input data for the dataset item. This field is required.

▪ **datasetItem.expectedOutput?**: `Maybe`\<`Record`\<`string`, `any`\>\>

The expected output data for the dataset item. This field is optional.

▪ **datasetItem.metadata?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Additional metadata for the dataset item. This field is optional.

###### Returns

`Promise`\<`DatasetItem`\>

A new `DatasetItem` instance populated with the created dataset item's data.

##### getDatasetItem()

> **getDatasetItem**(`id`): `Promise`\<`DatasetItem`\>

Retrieves a single item from a dataset by its unique identifier.

###### Parameters

▪ **id**: `string`

The unique identifier of the dataset item. This parameter is required.

###### Returns

`Promise`\<`DatasetItem`\>

A `DatasetItem` instance populated with the retrieved dataset item's data.

##### deleteDatasetItem()

> **deleteDatasetItem**(`id`): `Promise`\<`DatasetItem`\>

Deletes a single item from a dataset by its unique identifier.

###### Parameters

▪ **id**: `string`

The unique identifier of the dataset item to be deleted. This parameter is required.

###### Returns

`Promise`\<`DatasetItem`\>

A `DatasetItem` instance populated with the data of the deleted dataset item.

##### addStepToDataset()

> **addStepToDataset**(`datasetId`, `stepId`, `metadata`?): `Promise`\<`DatasetItem`\>

Adds a single step item to a dataset.

###### Parameters

▪ **datasetId**: `string`

The unique identifier of the dataset. This parameter is required.

▪ **stepId**: `string`

The unique identifier of the step to be added. This parameter is required.

▪ **metadata?**: `Maybe`\<`Record`\<`string`, `unknown`\>\>

Additional metadata for the step as a JSON object. This parameter is optional.

###### Returns

`Promise`\<`DatasetItem`\>

A `DatasetItem` instance populated with the data of the newly added step.

##### addGenerationToDataset()

> **addGenerationToDataset**(`datasetId`, `generationId`, `metadata`?): `Promise`\<`DatasetItem`\>

Adds a generation item to a dataset.

###### Parameters

▪ **datasetId**: `string`

The unique identifier of the dataset. This parameter is required.

▪ **generationId**: `string`

The unique identifier of the generation to be added. This parameter is required.

▪ **metadata?**: `Maybe`\<`Record`\<`string`, `unknown`\>\>

Additional metadata for the generation as a JSON object. This parameter is optional.

###### Returns

`Promise`\<`DatasetItem`\>

A `DatasetItem` instance populated with the data of the newly added generation.

##### createPromptLineage()

> **createPromptLineage**(`name`, `description`?): `Promise`\<`any`\>

Create a new prompt lineage.

###### Parameters

▪ **name**: `string`

The name of the prompt lineage. This parameter is required.

▪ **description?**: `string`

A description for the prompt lineage. This parameter is optional.

###### Returns

`Promise`\<`any`\>

The newly created prompt lineage object, or null if creation failed.

##### createPrompt()

> **createPrompt**(`name`, `templateMessages`, `settings`?): `Promise`\<`Prompt`\>

Create a new prompt.

###### Parameters

▪ **name**: `string`

The name of the prompt lineage. This parameter is required.

▪ **templateMessages**: `IGenerationMessage`[]

An array of template messages defining the prompt. This parameter is required.

▪ **settings?**: `Maybe`\<`Record`\<`string`, `any`\>\>

Optional settings for the prompt creation, provided as a record of string keys to any type of values.

###### Returns

`Promise`\<`Prompt`\>

A new Prompt instance containing the created prompt data.

##### getPrompt()

> **getPrompt**(`name`, `version`?): `Promise`\<`null` \| `Prompt`\>

Retrieves a prompt by its name and optionally by its version.

###### Parameters

▪ **name**: `string`

The name of the prompt to retrieve.

▪ **version?**: `number`

The version number of the prompt (optional).

###### Returns

`Promise`\<`null` \| `Prompt`\>

An instance of `Prompt` containing the prompt data, or `null` if not found.

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
