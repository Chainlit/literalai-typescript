**@literalai/client**

***

# @literalai/client

## Classes

### BaseGeneration

Represents a utility class with serialization capabilities.

#### Extends

- [`Utils`](README.md#utils)

#### Constructors

##### new BaseGeneration()

> **new BaseGeneration**(): [`BaseGeneration`](README.md#basegeneration)

###### Returns

[`BaseGeneration`](README.md#basegeneration)

###### Inherited from

[`Utils`](README.md#utils).[`constructor`](README.md#constructors-4)

#### Properties

##### promptId

> **promptId**?: `string`

##### provider

> **provider**?: [`Maybe`](README.md#maybet)\<`string`\>

##### model

> **model**?: [`Maybe`](README.md#maybet)\<`string`\>

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

##### error

> **error**?: [`Maybe`](README.md#maybet)\<`string`\>

##### variables

> **variables**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

##### settings

> **settings**?: [`Maybe`](README.md#maybet)\<[`ILLMSettings`](README.md#illmsettings)\>

##### tools

> **tools**?: [`Maybe`](README.md#maybet)\<[`ITool`](README.md#itool)[]\>

##### tokenCount

> **tokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

##### inputTokenCount

> **inputTokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

##### outputTokenCount

> **outputTokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

##### ttFirstToken

> **ttFirstToken**?: [`Maybe`](README.md#maybet)\<`number`\>

##### tokenThroughputInSeconds

> **tokenThroughputInSeconds**?: [`Maybe`](README.md#maybet)\<`number`\>

##### duration

> **duration**?: [`Maybe`](README.md#maybet)\<`number`\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](README.md#utils).[`serialize`](README.md#serialize-3)

***

### CompletionGeneration

Represents a utility class with serialization capabilities.

#### Extends

- [`BaseGeneration`](README.md#basegeneration)

#### Constructors

##### new CompletionGeneration(data)

> **new CompletionGeneration**(`data`): [`CompletionGeneration`](README.md#completiongeneration)

###### Parameters

▪ **data**: [`OmitUtils`](README.md#omitutilst)\<[`CompletionGeneration`](README.md#completiongeneration)\>

###### Returns

[`CompletionGeneration`](README.md#completiongeneration)

###### Overrides

[`BaseGeneration`](README.md#basegeneration).[`constructor`](README.md#constructors)

#### Properties

##### promptId

> **promptId**?: `string`

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`promptId`](README.md#promptid)

##### provider

> **provider**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`provider`](README.md#provider)

##### model

> **model**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`model`](README.md#model)

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`id`](README.md#id)

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tags`](README.md#tags)

##### error

> **error**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`error`](README.md#error)

##### variables

> **variables**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`variables`](README.md#variables)

##### settings

> **settings**?: [`Maybe`](README.md#maybet)\<[`ILLMSettings`](README.md#illmsettings)\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`settings`](README.md#settings)

##### tools

> **tools**?: [`Maybe`](README.md#maybet)\<[`ITool`](README.md#itool)[]\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tools`](README.md#tools)

##### tokenCount

> **tokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tokenCount`](README.md#tokencount)

##### inputTokenCount

> **inputTokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`inputTokenCount`](README.md#inputtokencount)

##### outputTokenCount

> **outputTokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`outputTokenCount`](README.md#outputtokencount)

##### ttFirstToken

> **ttFirstToken**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`ttFirstToken`](README.md#ttfirsttoken)

##### tokenThroughputInSeconds

> **tokenThroughputInSeconds**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tokenThroughputInSeconds`](README.md#tokenthroughputinseconds)

##### duration

> **duration**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`duration`](README.md#duration)

##### type

> **type**?: [`GenerationType`](README.md#generationtype) = `'COMPLETION'`

##### prompt

> **prompt**?: [`Maybe`](README.md#maybet)\<`string`\>

##### completion

> **completion**?: [`Maybe`](README.md#maybet)\<`string`\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`serialize`](README.md#serialize)

***

### ChatGeneration

Represents a utility class with serialization capabilities.

#### Extends

- [`BaseGeneration`](README.md#basegeneration)

#### Constructors

##### new ChatGeneration(data)

> **new ChatGeneration**(`data`): [`ChatGeneration`](README.md#chatgeneration)

###### Parameters

▪ **data**: [`OmitUtils`](README.md#omitutilst)\<[`ChatGeneration`](README.md#chatgeneration)\>

###### Returns

[`ChatGeneration`](README.md#chatgeneration)

###### Overrides

[`BaseGeneration`](README.md#basegeneration).[`constructor`](README.md#constructors)

#### Properties

##### promptId

> **promptId**?: `string`

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`promptId`](README.md#promptid)

##### provider

> **provider**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`provider`](README.md#provider)

##### model

> **model**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`model`](README.md#model)

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`id`](README.md#id)

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tags`](README.md#tags)

##### error

> **error**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`error`](README.md#error)

##### variables

> **variables**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`variables`](README.md#variables)

##### settings

> **settings**?: [`Maybe`](README.md#maybet)\<[`ILLMSettings`](README.md#illmsettings)\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`settings`](README.md#settings)

##### tools

> **tools**?: [`Maybe`](README.md#maybet)\<[`ITool`](README.md#itool)[]\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tools`](README.md#tools)

##### tokenCount

> **tokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tokenCount`](README.md#tokencount)

##### inputTokenCount

> **inputTokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`inputTokenCount`](README.md#inputtokencount)

##### outputTokenCount

> **outputTokenCount**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`outputTokenCount`](README.md#outputtokencount)

##### ttFirstToken

> **ttFirstToken**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`ttFirstToken`](README.md#ttfirsttoken)

##### tokenThroughputInSeconds

> **tokenThroughputInSeconds**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`tokenThroughputInSeconds`](README.md#tokenthroughputinseconds)

##### duration

> **duration**?: [`Maybe`](README.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`duration`](README.md#duration)

##### type

> **type**?: [`GenerationType`](README.md#generationtype) = `'CHAT'`

##### messages

> **messages**?: [`Maybe`](README.md#maybet)\<[`IGenerationMessage`](README.md#igenerationmessage)[]\> = `[]`

##### messageCompletion

> **messageCompletion**?: [`Maybe`](README.md#maybet)\<[`IGenerationMessage`](README.md#igenerationmessage)\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`BaseGeneration`](README.md#basegeneration).[`serialize`](README.md#serialize)

***

### LiteralClient

#### Constructors

##### new LiteralClient(__namedParameters)

> **new LiteralClient**(`__namedParameters`): [`LiteralClient`](README.md#literalclient)

###### Parameters

▪ **\_\_namedParameters**: `object`= `{}`

▪ **\_\_namedParameters.apiKey?**: `string`

▪ **\_\_namedParameters.apiUrl?**: `string`

▪ **\_\_namedParameters.environment?**: [`Environment`](README.md#environment-3)

▪ **\_\_namedParameters.disabled?**: `boolean`

###### Returns

[`LiteralClient`](README.md#literalclient)

#### Properties

##### api

> **api**: `API`

##### openai

> **openai**: (`openai`) => `object`

###### Parameters

▪ **openai**: `OpenAI`

###### Returns

`object`

> ###### assistant
>
> > **assistant**: `object`
>
> ###### assistant.syncer
>
> > **assistant.syncer**: `OpenAIAssistantSyncer`
>

##### instrumentation

> **instrumentation**: `object`

###### Type declaration

###### openai

> **openai**: (`options`?) => `object`

###### Parameters

▪ **options?**: [`OpenAIGlobalOptions`](README.md#openaiglobaloptions)

###### Returns

`object`

> ###### chat
>
> > **chat**: `object`
>
> ###### chat.completions
>
> > **chat.completions**: `object`
>
> ###### chat.completions.create
>
> > **chat.completions.create**: (`this`, `body`, `callOptions`?) => `Promise`\<`Stream`\<`ChatCompletionChunk`\> \| `ChatCompletion`\> = `wrappedChatCompletionsCreate`
>
> ###### Parameters
>
> ▪ **this**: `any`
>
> ▪ **body**: `any`
>
> ▪ **callOptions?**: `RequestOptions` & `OpenAICallOptions`
>
> ###### Returns
>
> `Promise`\<`Stream`\<`ChatCompletionChunk`\> \| `ChatCompletion`\>
>
> ###### completions
>
> > **completions**: `object`
>
> ###### completions.create
>
> > **completions.create**: (`this`, `body`, `callOptions`?) => `Promise`\<`Completion` \| `Stream`\<`Completion`\>\> = `wrappedCompletionsCreate`
>
> ###### Parameters
>
> ▪ **this**: `any`
>
> ▪ **body**: `any`
>
> ▪ **callOptions?**: `RequestOptions` & `OpenAICallOptions`
>
> ###### Returns
>
> `Promise`\<`Completion` \| `Stream`\<`Completion`\>\>
>
> ###### images
>
> > **images**: `object`
>
> ###### images.generate
>
> > **images.generate**: (`this`, `body`, `callOptions`?) => `Promise`\<`ImagesResponse`\> = `wrappedImagesGenerate`
>
> ###### Parameters
>
> ▪ **this**: `any`
>
> ▪ **body**: `any`
>
> ▪ **callOptions?**: `RequestOptions` & `OpenAICallOptions`
>
> ###### Returns
>
> `Promise`\<`ImagesResponse`\>
>

###### langchain

> **langchain**: `object`

###### langchain.literalCallback

> **langchain.literalCallback**: (`threadId`?) => `LiteralCallbackHandler`

###### Parameters

▪ **threadId?**: `string`

###### Returns

`LiteralCallbackHandler`

###### vercel

> **vercel**: `object`

###### vercel.instrument

> **vercel.instrument**: `InstrumentationVercelMethod`

###### llamaIndex

> **llamaIndex**: `object`

###### llamaIndex.instrument

> **llamaIndex.instrument**: () => `void`

###### Returns

`void`

###### llamaIndex.withThread

> **llamaIndex.withThread**: \<`R`\>(`thread`, `callback`) => `R`

###### Type parameters

▪ **R**

###### Parameters

▪ **thread**: [`Thread`](README.md#thread-1)

▪ **callback**: () => `R`

###### Returns

`R`

##### store

> **store**: `AsyncLocalStorage`\<`StoredContext`\> = `storage`

#### Methods

##### thread()

> **thread**(`data`?): [`Thread`](README.md#thread-1)

###### Parameters

▪ **data?**: [`ThreadConstructor`](README.md#threadconstructor)

###### Returns

[`Thread`](README.md#thread-1)

##### step()

> **step**(`data`): [`Step`](README.md#step-2)

###### Parameters

▪ **data**: [`StepConstructor`](README.md#stepconstructor)

###### Returns

[`Step`](README.md#step-2)

##### run()

> **run**(`data`): [`Step`](README.md#step-2)

###### Parameters

▪ **data**: `Omit`\<[`StepConstructor`](README.md#stepconstructor), `"type"`\>

###### Returns

[`Step`](README.md#step-2)

##### experimentRun()

> **experimentRun**(`data`?): [`ExperimentRun`](README.md#experimentrun-1)

###### Parameters

▪ **data?**: `Omit`\<[`StepConstructor`](README.md#stepconstructor), `"name"` \| `"type"`\>

###### Returns

[`ExperimentRun`](README.md#experimentrun-1)

##### \_currentThread()

> **\_currentThread**(): `null` \| [`Thread`](README.md#thread-1)

###### Returns

`null` \| [`Thread`](README.md#thread-1)

##### \_currentStep()

> **\_currentStep**(): `null` \| [`Step`](README.md#step-2)

###### Returns

`null` \| [`Step`](README.md#step-2)

##### getCurrentThread()

> **getCurrentThread**(): [`Thread`](README.md#thread-1)

Gets the current thread from the context.
WARNING : this will throw if run outside of a thread context.

###### Returns

[`Thread`](README.md#thread-1)

The current thread, if any.

##### getCurrentStep()

> **getCurrentStep**(): [`Step`](README.md#step-2)

Gets the current step from the context.
WARNING : this will throw if run outside of a step context.

###### Returns

[`Step`](README.md#step-2)

The current step, if any.

***

### Utils

Represents a utility class with serialization capabilities.

#### Extended By

- [`Attachment`](README.md#attachment)
- [`User`](README.md#user)
- [`DatasetItem`](README.md#datasetitem)
- [`DatasetExperiment`](README.md#datasetexperiment)
- [`BaseGeneration`](README.md#basegeneration)

#### Constructors

##### new Utils()

> **new Utils**(): [`Utils`](README.md#utils)

###### Returns

[`Utils`](README.md#utils)

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

***

### Score

Represents a score entity with properties to track various aspects of scoring.
It extends the `Utils` class for serialization capabilities.

#### Extends

- `ScoreFields`

#### Constructors

##### new Score(data)

> **new Score**(`data`): [`Score`](README.md#score)

###### Parameters

▪ **data**: [`ScoreConstructor`](README.md#scoreconstructor)

###### Returns

[`Score`](README.md#score)

###### Overrides

ScoreFields.constructor

#### Properties

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ScoreFields.id

##### stepId

> **stepId**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ScoreFields.stepId

##### generationId

> **generationId**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ScoreFields.generationId

##### datasetExperimentItemId

> **datasetExperimentItemId**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ScoreFields.datasetExperimentItemId

##### name

> **name**: `string` = `'user-feedback'`

###### Inherited from

ScoreFields.name

##### value

> **value**: `number` = `0`

###### Inherited from

ScoreFields.value

##### type

> **type**: [`ScoreType`](README.md#scoretype) = `'AI'`

###### Inherited from

ScoreFields.type

##### scorer

> **scorer**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ScoreFields.scorer

##### comment

> **comment**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ScoreFields.comment

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

###### Inherited from

ScoreFields.tags

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

ScoreFields.serialize

***

### Attachment

Represents an attachment with optional metadata, MIME type, and other properties.
It extends the `Utils` class for serialization capabilities.

#### Extends

- [`Utils`](README.md#utils)

#### Constructors

##### new Attachment(data)

> **new Attachment**(`data`): [`Attachment`](README.md#attachment)

###### Parameters

▪ **data**: [`OmitUtils`](README.md#omitutilst)\<[`Attachment`](README.md#attachment)\>

###### Returns

[`Attachment`](README.md#attachment)

###### Overrides

[`Utils`](README.md#utils).[`constructor`](README.md#constructors-4)

#### Properties

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

##### mime

> **mime**?: [`Maybe`](README.md#maybet)\<`string`\>

##### name

> **name**: [`Maybe`](README.md#maybet)\<`string`\>

##### objectKey

> **objectKey**?: [`Maybe`](README.md#maybet)\<`string`\>

##### url

> **url**?: [`Maybe`](README.md#maybet)\<`string`\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](README.md#utils).[`serialize`](README.md#serialize-3)

***

### Thread

Represents a thread in the system, extending the properties and methods from `ThreadFields`.
This class manages thread-specific operations such as creation and updates via the API.

#### Extends

- `ThreadFields`

#### Constructors

##### new Thread(client, data)

> **new Thread**(`client`, `data`?): [`Thread`](README.md#thread-1)

Constructs a new Thread instance.

###### Parameters

▪ **client**: [`LiteralClient`](README.md#literalclient)

▪ **data?**: [`ThreadConstructor`](README.md#threadconstructor)

Optional initial data for the thread, with an auto-generated ID if not provided.

###### Returns

[`Thread`](README.md#thread-1)

###### Overrides

ThreadFields.constructor

#### Properties

##### id

> **id**: `string`

###### Inherited from

ThreadFields.id

##### participantId

> **participantId**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ThreadFields.participantId

##### environment

> **environment**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ThreadFields.environment

##### name

> **name**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

ThreadFields.name

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

ThreadFields.metadata

##### steps

> **steps**?: [`Maybe`](README.md#maybet)\<[`Step`](README.md#step-2)[]\>

###### Inherited from

ThreadFields.steps

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

###### Inherited from

ThreadFields.tags

##### api

> **api**: `API`

##### client

> **client**: [`LiteralClient`](README.md#literalclient)

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

ThreadFields.serialize

##### step()

> **step**(`data`): [`Step`](README.md#step-2)

Creates a new step associated with this thread.

###### Parameters

▪ **data**: `Omit`\<[`StepConstructor`](README.md#stepconstructor), `"threadId"`\>

The data for the new step, excluding the thread ID.

###### Returns

[`Step`](README.md#step-2)

A new Step instance linked to this thread.

##### run()

> **run**(`data`): [`Step`](README.md#step-2)

Creates a new Run step associated with this thread.

###### Parameters

▪ **data**: `Omit`\<[`StepConstructor`](README.md#stepconstructor), `"type"` \| `"threadId"`\>

The data for the new step, excluding the thread ID and the type

###### Returns

[`Step`](README.md#step-2)

A new Step instance linked to this thread.

##### upsert()

> **upsert**(): `Promise`\<[`Thread`](README.md#thread-1)\>

Upserts the thread data to the backend, creating or updating as necessary.

###### Returns

`Promise`\<[`Thread`](README.md#thread-1)\>

The updated Thread instance.

##### wrap()

> **wrap**\<`Output`\>(`cb`, `updateThread`?): `Promise`\<`Output`\>

Sends the thread to the API, handling disabled state and setting the end time if not already set.

###### Type parameters

▪ **Output**

###### Parameters

▪ **cb**: (`thread`) => `Output` \| `Promise`\<`Output`\>

The callback function to run within the context of the thread.

▪ **updateThread?**: [`ThreadConstructor`](README.md#threadconstructor) \| (`output`) => [`ThreadConstructor`](README.md#threadconstructor) \| (`output`) => `Promise`\<[`ThreadConstructor`](README.md#threadconstructor)\>

Optional update function to modify the thread after the callback.

###### Returns

`Promise`\<`Output`\>

The output of the wrapped callback function.

***

### Step

Represents a step in a process or workflow, extending the fields and methods from StepFields.

#### Extends

- `StepFields`

#### Constructors

##### new Step(client, data, ignoreContext)

> **new Step**(`client`, `data`, `ignoreContext`?): [`Step`](README.md#step-2)

Constructs a new Step instance.

###### Parameters

▪ **client**: [`LiteralClient`](README.md#literalclient)

▪ **data**: [`StepConstructor`](README.md#stepconstructor)

The initial data for the step, excluding utility properties.

▪ **ignoreContext?**: `true`

###### Returns

[`Step`](README.md#step-2)

###### Overrides

StepFields.constructor

#### Properties

##### name

> **name**: `string`

###### Inherited from

StepFields.name

##### type

> **type**: [`StepType`](README.md#steptype)

###### Inherited from

StepFields.type

##### threadId

> **threadId**?: `string`

###### Inherited from

StepFields.threadId

##### createdAt

> **createdAt**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

StepFields.createdAt

##### startTime

> **startTime**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

StepFields.startTime

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

StepFields.id

##### environment

> **environment**?: [`Maybe`](README.md#maybet)\<[`Environment`](README.md#environment-3)\>

###### Inherited from

StepFields.environment

##### error

> **error**?: [`Maybe`](README.md#maybet)\<`string` \| `Record`\<`string`, `any`\>\>

###### Inherited from

StepFields.error

##### input

> **input**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

StepFields.input

##### output

> **output**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

StepFields.output

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

StepFields.metadata

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

###### Inherited from

StepFields.tags

##### parentId

> **parentId**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

StepFields.parentId

##### endTime

> **endTime**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

StepFields.endTime

##### generation

> **generation**?: [`Maybe`](README.md#maybet)\<[`Generation`](README.md#generation-2)\>

###### Inherited from

StepFields.generation

##### scores

> **scores**?: [`Maybe`](README.md#maybet)\<[`Score`](README.md#score)[]\>

###### Inherited from

StepFields.scores

##### attachments

> **attachments**?: [`Maybe`](README.md#maybet)\<[`Attachment`](README.md#attachment)[]\>

###### Inherited from

StepFields.attachments

##### api

> **api**: `API`

##### client

> **client**: [`LiteralClient`](README.md#literalclient)

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the step instance, converting complex objects to strings as necessary.

###### Returns

`any`

A serialized representation of the step.

###### Overrides

StepFields.serialize

##### isMessage()

> **isMessage**(): `boolean`

Determines if the step is a type of message.

###### Returns

`boolean`

True if the step is a user, assistant, or system message.

##### step()

> **step**(`data`): [`Step`](README.md#step-2)

Creates a new step instance linked to the current step as a parent.

###### Parameters

▪ **data**: `Omit`\<[`StepConstructor`](README.md#stepconstructor), `"threadId"`\>

The data for the new step, excluding the threadId which is inherited.

###### Returns

[`Step`](README.md#step-2)

A new Step instance.

##### send()

> **send**(): `Promise`\<[`Step`](README.md#step-2)\>

Sends the step to the API, handling disabled state and setting the end time if not already set.

###### Returns

`Promise`\<[`Step`](README.md#step-2)\>

The current Step instance after potentially sending to the API.

##### wrap()

> **wrap**\<`Output`\>(`cb`, `updateStep`?): `Promise`\<`Output`\>

Sends the step to the API, handling disabled state and setting the end time if not already set.

###### Type parameters

▪ **Output**

###### Parameters

▪ **cb**: (`step`) => `Output` \| `Promise`\<`Output`\>

The callback function to run within the context of the step.

▪ **updateStep?**: `Partial`\<[`StepConstructor`](README.md#stepconstructor)\> \| (`output`) => `Partial`\<[`StepConstructor`](README.md#stepconstructor)\> \| (`output`) => `Promise`\<`Partial`\<[`StepConstructor`](README.md#stepconstructor)\>\>

Optional update function to modify the step after the callback.

###### Returns

`Promise`\<`Output`\>

The output of the wrapped callback function.

***

### ExperimentRun

Represents a step in a process or workflow, extending the fields and methods from StepFields.

#### Extends

- [`Step`](README.md#step-2)

#### Constructors

##### new ExperimentRun(client, data, ignoreContext)

> **new ExperimentRun**(`client`, `data`, `ignoreContext`?): [`ExperimentRun`](README.md#experimentrun-1)

Constructs a new ExperimentRun instance.

###### Parameters

▪ **client**: [`LiteralClient`](README.md#literalclient)

▪ **data**: [`StepConstructor`](README.md#stepconstructor)

The initial data for the step, excluding utility properties.

▪ **ignoreContext?**: `true`

###### Returns

[`ExperimentRun`](README.md#experimentrun-1)

###### Overrides

[`Step`](README.md#step-2).[`constructor`](README.md#constructors-8)

#### Properties

##### name

> **name**: `string`

###### Inherited from

[`Step`](README.md#step-2).[`name`](README.md#name-3)

##### type

> **type**: [`StepType`](README.md#steptype)

###### Inherited from

[`Step`](README.md#step-2).[`type`](README.md#type-3)

##### threadId

> **threadId**?: `string`

###### Inherited from

[`Step`](README.md#step-2).[`threadId`](README.md#threadid)

##### createdAt

> **createdAt**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`Step`](README.md#step-2).[`createdAt`](README.md#createdat)

##### startTime

> **startTime**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`Step`](README.md#step-2).[`startTime`](README.md#starttime)

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`Step`](README.md#step-2).[`id`](README.md#id-6)

##### environment

> **environment**?: [`Maybe`](README.md#maybet)\<[`Environment`](README.md#environment-3)\>

###### Inherited from

[`Step`](README.md#step-2).[`environment`](README.md#environment-1)

##### error

> **error**?: [`Maybe`](README.md#maybet)\<`string` \| `Record`\<`string`, `any`\>\>

###### Inherited from

[`Step`](README.md#step-2).[`error`](README.md#error-3)

##### input

> **input**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`Step`](README.md#step-2).[`input`](README.md#input)

##### output

> **output**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`Step`](README.md#step-2).[`output`](README.md#output)

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`Step`](README.md#step-2).[`metadata`](README.md#metadata-2)

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

###### Inherited from

[`Step`](README.md#step-2).[`tags`](README.md#tags-5)

##### parentId

> **parentId**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`Step`](README.md#step-2).[`parentId`](README.md#parentid)

##### endTime

> **endTime**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

[`Step`](README.md#step-2).[`endTime`](README.md#endtime)

##### generation

> **generation**?: [`Maybe`](README.md#maybet)\<[`Generation`](README.md#generation-2)\>

###### Inherited from

[`Step`](README.md#step-2).[`generation`](README.md#generation)

##### scores

> **scores**?: [`Maybe`](README.md#maybet)\<[`Score`](README.md#score)[]\>

###### Inherited from

[`Step`](README.md#step-2).[`scores`](README.md#scores)

##### attachments

> **attachments**?: [`Maybe`](README.md#maybet)\<[`Attachment`](README.md#attachment)[]\>

###### Inherited from

[`Step`](README.md#step-2).[`attachments`](README.md#attachments)

##### api

> **api**: `API`

###### Overrides

[`Step`](README.md#step-2).[`api`](README.md#api-2)

##### client

> **client**: [`LiteralClient`](README.md#literalclient)

###### Overrides

[`Step`](README.md#step-2).[`client`](README.md#client-1)

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the step instance, converting complex objects to strings as necessary.

###### Returns

`any`

A serialized representation of the step.

###### Inherited from

[`Step`](README.md#step-2).[`serialize`](README.md#serialize-7)

##### isMessage()

> **isMessage**(): `boolean`

Determines if the step is a type of message.

###### Returns

`boolean`

True if the step is a user, assistant, or system message.

###### Inherited from

[`Step`](README.md#step-2).[`isMessage`](README.md#ismessage)

##### step()

> **step**(`data`): [`Step`](README.md#step-2)

Creates a new step instance linked to the current step as a parent.

###### Parameters

▪ **data**: `Omit`\<[`StepConstructor`](README.md#stepconstructor), `"threadId"`\>

The data for the new step, excluding the threadId which is inherited.

###### Returns

[`Step`](README.md#step-2)

A new Step instance.

###### Inherited from

[`Step`](README.md#step-2).[`step`](README.md#step-3)

##### send()

> **send**(): `Promise`\<[`ExperimentRun`](README.md#experimentrun-1)\>

Sends the step to the API, handling disabled state and setting the end time if not already set.

###### Returns

`Promise`\<[`ExperimentRun`](README.md#experimentrun-1)\>

The current Step instance after potentially sending to the API.

###### Inherited from

[`Step`](README.md#step-2).[`send`](README.md#send)

##### wrap()

> **wrap**\<`Output`\>(`cb`, `updateStep`?): `Promise`\<`Output`\>

Sends the step to the API, handling disabled state and setting the end time if not already set.

###### Type parameters

▪ **Output**

###### Parameters

▪ **cb**: (`step`) => `Output` \| `Promise`\<`Output`\>

The callback function to run within the context of the step.

▪ **updateStep?**: `Partial`\<[`StepConstructor`](README.md#stepconstructor)\> \| (`output`) => `Partial`\<[`StepConstructor`](README.md#stepconstructor)\> \| (`output`) => `Promise`\<`Partial`\<[`StepConstructor`](README.md#stepconstructor)\>\>

Optional update function to modify the step after the callback.

###### Returns

`Promise`\<`Output`\>

The output of the wrapped callback function.

###### Overrides

[`Step`](README.md#step-2).[`wrap`](README.md#wrap-1)

***

### User

Represents a user with optional metadata and identifier.

#### Extends

- [`Utils`](README.md#utils)

#### Constructors

##### new User(data)

> **new User**(`data`): [`User`](README.md#user)

###### Parameters

▪ **data**: [`OmitUtils`](README.md#omitutilst)\<[`User`](README.md#user)\>

###### Returns

[`User`](README.md#user)

###### Overrides

[`Utils`](README.md#utils).[`constructor`](README.md#constructors-4)

#### Properties

##### id

> **id**?: [`Maybe`](README.md#maybet)\<`string`\>

##### identifier

> **identifier**: `string`

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](README.md#utils).[`serialize`](README.md#serialize-3)

***

### Dataset

#### Extends

- `DatasetFields`

#### Constructors

##### new Dataset(api, data)

> **new Dataset**(`api`, `data`): [`Dataset`](README.md#dataset)

Constructs a new Dataset instance.

###### Parameters

▪ **api**: `API`

The API instance to interact with backend services.

▪ **data**: [`DatasetConstructor`](README.md#datasetconstructor)

The initial data for the dataset.

###### Returns

[`Dataset`](README.md#dataset)

###### Overrides

DatasetFields.constructor

#### Properties

##### id

> **id**: `string`

###### Inherited from

DatasetFields.id

##### createdAt

> **createdAt**: `string`

###### Inherited from

DatasetFields.createdAt

##### name

> **name**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

DatasetFields.name

##### description

> **description**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

DatasetFields.description

##### metadata

> **metadata**: `Record`\<`string`, `any`\>

###### Inherited from

DatasetFields.metadata

##### items

> **items**: [`OmitUtils`](README.md#omitutilst)\<[`DatasetItem`](README.md#datasetitem)\>[]

###### Inherited from

DatasetFields.items

##### type

> **type**?: [`DatasetType`](README.md#datasettype)

###### Inherited from

DatasetFields.type

##### api

> **api**: `API`

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

DatasetFields.serialize

##### update()

> **update**(`dataset`): `Promise`\<`void`\>

Updates the dataset with new data.

###### Parameters

▪ **dataset**: `object`

The dataset data to update.

▪ **dataset.name?**: [`Maybe`](README.md#maybet)\<`string`\>

▪ **dataset.description?**: [`Maybe`](README.md#maybet)\<`string`\>

▪ **dataset.metadata?**: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Returns

`Promise`\<`void`\>

The updated dataset instance.

##### delete()

> **delete**(): `Promise`\<[`Dataset`](README.md#dataset)\>

Deletes the dataset.

###### Returns

`Promise`\<[`Dataset`](README.md#dataset)\>

A promise that resolves when the dataset is deleted.

##### createItem()

> **createItem**(`datasetItem`): `Promise`\<[`DatasetItem`](README.md#datasetitem)\>

Creates a new item in the dataset.

###### Parameters

▪ **datasetItem**: `object`

The new item to be added to the dataset.

▪ **datasetItem.input**: `Record`\<`string`, `any`\>

▪ **datasetItem.expectedOutput?**: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

▪ **datasetItem.metadata?**: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Returns

`Promise`\<[`DatasetItem`](README.md#datasetitem)\>

The newly created dataset item.

##### deleteItem()

> **deleteItem**(`id`): `Promise`\<[`DatasetItem`](README.md#datasetitem)\>

Deletes an item from the dataset.

###### Parameters

▪ **id**: `string`

The ID of the item to delete.

###### Returns

`Promise`\<[`DatasetItem`](README.md#datasetitem)\>

The deleted dataset item.

##### createExperiment()

> **createExperiment**(`experiment`): `Promise`\<[`DatasetExperiment`](README.md#datasetexperiment)\>

Creates a new experiment associated with the dataset.

###### Parameters

▪ **experiment**: `object`

The experiment details including name, optional prompt ID, and parameters.

▪ **experiment.name**: `string`

▪ **experiment.promptId?**: `string`

▪ **experiment.params?**: `Record`\<`string`, `any`\> \| `Record`\<`string`, `any`\>[]

###### Returns

`Promise`\<[`DatasetExperiment`](README.md#datasetexperiment)\>

A new instance of DatasetExperiment containing the created experiment.

##### addStep()

> **addStep**(`stepId`, `metadata`?): `Promise`\<[`DatasetItem`](README.md#datasetitem)\>

Adds a step to the dataset.

###### Parameters

▪ **stepId**: `string`

The ID of the step to add.

▪ **metadata?**: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `unknown`\>\>

Optional metadata for the step.

###### Returns

`Promise`\<[`DatasetItem`](README.md#datasetitem)\>

The added dataset item.

###### Throws

Error if the dataset type is 'generation'.

##### addGeneration()

> **addGeneration**(`generationId`, `metadata`?): `Promise`\<[`DatasetItem`](README.md#datasetitem)\>

Adds a generation to the dataset.

###### Parameters

▪ **generationId**: `string`

The ID of the generation to add.

▪ **metadata?**: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `unknown`\>\>

Optional metadata for the generation.

###### Returns

`Promise`\<[`DatasetItem`](README.md#datasetitem)\>

The added dataset item.

##### addGenerations()

> **addGenerations**(`generationIds`?): `Promise`\<[`DatasetItem`](README.md#datasetitem)[]\>

###### Parameters

▪ **generationIds?**: `string`[]

###### Returns

`Promise`\<[`DatasetItem`](README.md#datasetitem)[]\>

***

### DatasetItem

Represents a utility class with serialization capabilities.

#### Extends

- [`Utils`](README.md#utils)

#### Constructors

##### new DatasetItem(data)

> **new DatasetItem**(`data`): [`DatasetItem`](README.md#datasetitem)

###### Parameters

▪ **data**: [`OmitUtils`](README.md#omitutilst)\<[`DatasetItem`](README.md#datasetitem)\>

###### Returns

[`DatasetItem`](README.md#datasetitem)

###### Overrides

[`Utils`](README.md#utils).[`constructor`](README.md#constructors-4)

#### Properties

##### id

> **id**: `string`

##### createdAt

> **createdAt**: `string`

##### datasetId

> **datasetId**: `string`

##### metadata

> **metadata**: `Record`\<`string`, `any`\>

##### input

> **input**: `Record`\<`string`, `any`\>

##### expectedOutput

> **expectedOutput**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

##### intermediarySteps

> **intermediarySteps**: `Record`\<`string`, `any`\>[]

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](README.md#utils).[`serialize`](README.md#serialize-3)

***

### DatasetExperiment

Represents a utility class with serialization capabilities.

#### Extends

- [`Utils`](README.md#utils)

#### Constructors

##### new DatasetExperiment(api, data)

> **new DatasetExperiment**(`api`, `data`): [`DatasetExperiment`](README.md#datasetexperiment)

###### Parameters

▪ **api**: `API`

▪ **data**: [`OmitUtils`](README.md#omitutilst)\<[`DatasetExperiment`](README.md#datasetexperiment)\>

###### Returns

[`DatasetExperiment`](README.md#datasetexperiment)

###### Overrides

[`Utils`](README.md#utils).[`constructor`](README.md#constructors-4)

#### Properties

##### id

> **id**: `string`

##### createdAt

> **createdAt**: `string`

##### name

> **name**: `string`

##### datasetId

> **datasetId**?: `string`

##### promptId

> **promptId**?: `string`

##### api

> **api**: `API`

##### params

> **params**: `Record`\<`string`, `any`\> \| `Record`\<`string`, `any`\>[]

##### items

> **items**: [`DatasetExperimentItem`](README.md#datasetexperimentitem)[]

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](README.md#utils).[`serialize`](README.md#serialize-3)

##### log()

> **log**(`itemFields`): `Promise`\<[`DatasetExperimentItem`](README.md#datasetexperimentitem)\>

###### Parameters

▪ **itemFields**: `Omit`\<[`OmitUtils`](README.md#omitutilst)\<`DatasetExperimentItemFields`\>, `"id"` \| `"datasetExperimentId"`\>

###### Returns

`Promise`\<[`DatasetExperimentItem`](README.md#datasetexperimentitem)\>

***

### DatasetExperimentItem

#### Extends

- `DatasetExperimentItemFields`

#### Constructors

##### new DatasetExperimentItem(data)

> **new DatasetExperimentItem**(`data`): [`DatasetExperimentItem`](README.md#datasetexperimentitem)

###### Parameters

▪ **data**: [`DatasetExperimentItemConstructor`](README.md#datasetexperimentitemconstructor)

###### Returns

[`DatasetExperimentItem`](README.md#datasetexperimentitem)

###### Overrides

DatasetExperimentItemFields.constructor

#### Properties

##### id

> **id**?: `string`

###### Inherited from

DatasetExperimentItemFields.id

##### datasetExperimentId

> **datasetExperimentId**: `string`

###### Inherited from

DatasetExperimentItemFields.datasetExperimentId

##### datasetItemId

> **datasetItemId**?: `string`

###### Inherited from

DatasetExperimentItemFields.datasetItemId

##### experimentRunId

> **experimentRunId**?: `string`

###### Inherited from

DatasetExperimentItemFields.experimentRunId

##### scores

> **scores**: [`ScoreConstructor`](README.md#scoreconstructor)[]

###### Inherited from

DatasetExperimentItemFields.scores

##### input

> **input**?: `Record`\<`string`, `any`\>

###### Inherited from

DatasetExperimentItemFields.input

##### output

> **output**?: `Record`\<`string`, `any`\>

###### Inherited from

DatasetExperimentItemFields.output

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

DatasetExperimentItemFields.serialize

***

### Prompt

#### Extends

- `PromptFields`

#### Constructors

##### new Prompt(api, data)

> **new Prompt**(`api`, `data`): [`Prompt`](README.md#prompt-1)

Constructs a new Prompt instance.

###### Parameters

▪ **api**: `API`

The API instance to interact with backend services.

▪ **data**: [`PromptConstructor`](README.md#promptconstructor)

The initial data for the prompt.

###### Returns

[`Prompt`](README.md#prompt-1)

###### Overrides

PromptFields.constructor

#### Properties

##### id

> **id**: `string`

###### Inherited from

PromptFields.id

##### type

> **type**: [`GenerationType`](README.md#generationtype)

###### Inherited from

PromptFields.type

##### createdAt

> **createdAt**: `string`

###### Inherited from

PromptFields.createdAt

##### name

> **name**: `string`

###### Inherited from

PromptFields.name

##### version

> **version**: `number`

###### Inherited from

PromptFields.version

##### versionDesc

> **versionDesc**?: [`Maybe`](README.md#maybet)\<`string`\>

###### Inherited from

PromptFields.versionDesc

##### metadata

> **metadata**: `Record`\<`string`, `any`\>

###### Inherited from

PromptFields.metadata

##### items

> **items**: [`OmitUtils`](README.md#omitutilst)\<[`DatasetItem`](README.md#datasetitem)\>[]

###### Inherited from

PromptFields.items

##### variablesDefaultValues

> **variablesDefaultValues**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

PromptFields.variablesDefaultValues

##### templateMessages

> **templateMessages**: [`IGenerationMessage`](README.md#igenerationmessage)[]

###### Inherited from

PromptFields.templateMessages

##### tools

> **tools**?: `ChatCompletionTool`[]

###### Inherited from

PromptFields.tools

##### provider

> **provider**: `string`

###### Inherited from

PromptFields.provider

##### settings

> **settings**: [`IProviderSettings`](README.md#iprovidersettings)

###### Inherited from

PromptFields.settings

##### variables

> **variables**: [`IPromptVariableDefinition`](README.md#ipromptvariabledefinition)[]

###### Inherited from

PromptFields.variables

##### api

> **api**: `API`

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

PromptFields.serialize

##### formatMessages()

> **formatMessages**(`variables`?): `ChatCompletionMessageParam`[]

Formats the prompt's template messages with the given variables.

###### Parameters

▪ **variables?**: `Record`\<`string`, `any`\>

Optional variables to resolve in the template messages.

###### Returns

`ChatCompletionMessageParam`[]

An array of formatted chat completion messages.

##### format()

> **format**(`variables`?): `ChatCompletionMessageParam`[]

###### Parameters

▪ **variables?**: `Record`\<`string`, `any`\>

###### Returns

`ChatCompletionMessageParam`[]

###### Deprecated

Please use `formatMessages` instead.

##### toLangchainChatPromptTemplate()

> **toLangchainChatPromptTemplate**(): `CustomChatPromptTemplate`

Converts the prompt's template messages into a Langchain chat prompt template.

###### Returns

`CustomChatPromptTemplate`

A custom chat prompt template configured with the prompt's data.

## Interfaces

### ITextContent

#### Properties

##### type

> **type**: `"text"`

##### text

> **text**: `string`

***

### IImageUrlContent

#### Properties

##### type

> **type**: `"image_url"`

##### image\_url

> **image\_url**: `string`

***

### IGenerationMessage

#### Properties

##### uuid

> **uuid**?: `string`

##### templated

> **templated**?: `boolean`

##### content

> **content**: `null` \| `string` \| ([`ITextContent`](README.md#itextcontent) \| [`IImageUrlContent`](README.md#iimageurlcontent))[]

##### role

> **role**: [`GenerationMessageRole`](README.md#generationmessagerole)

##### name

> **name**?: `string`

##### function\_call

> **function\_call**?: `Record`\<`string`, `any`\>

##### tool\_calls

> **tool\_calls**?: `Record`\<`string`, `any`\>[]

##### tool\_call\_id

> **tool\_call\_id**?: `string`

***

### IFunction

#### Properties

##### name

> **name**: `string`

##### description

> **description**: `string`

##### parameters

> **parameters**: `object`

###### Type declaration

###### required

> **required**: `string`[]

###### properties

> **properties**: `Record`\<`string`, `object`\>

***

### ITool

#### Properties

##### type

> **type**: `string`

##### function

> **function**: [`IFunction`](README.md#ifunction)

***

### IPromptVariableDefinition

#### Properties

##### name

> **name**: `string`

##### language

> **language**: `"json"` \| `"plaintext"`

***

### IProviderSettings

#### Properties

##### provider

> **provider**: `string`

##### model

> **model**: `string`

##### frequency\_penalty

> **frequency\_penalty**: `number`

##### max\_tokens

> **max\_tokens**: `number`

##### presence\_penalty

> **presence\_penalty**: `number`

##### stop

> **stop**?: `string`[]

##### temperature

> **temperature**: `number`

##### top\_p

> **top\_p**: `number`

## Type Aliases

### GenerationMessageRole

> **GenerationMessageRole**: `"system"` \| `"assistant"` \| `"user"` \| `"function"` \| `"tool"`

***

### ILLMSettings

> **ILLMSettings**: `Record`\<`string`, `string` \| `string`[] \| `number` \| `boolean`\>

***

### GenerationType

> **GenerationType**: `"COMPLETION"` \| `"CHAT"`

***

### Generation

> **Generation**: [`OmitUtils`](README.md#omitutilst)\<[`CompletionGeneration`](README.md#completiongeneration)\> \| [`OmitUtils`](README.md#omitutilst)\<[`ChatGeneration`](README.md#chatgeneration)\>

***

### PersistedGeneration

> **PersistedGeneration**: [`Generation`](README.md#generation-2) & `object`

#### Type declaration

##### id

> **id**: `string`

***

### OpenAIGlobalOptions

> **OpenAIGlobalOptions**: `object`

#### Type declaration

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

***

### Maybe`<T>`

> **Maybe**\<`T`\>: `T` \| `null` \| `undefined`

#### Type parameters

| Parameter |
| :------ |
| `T` |

***

### OmitUtils`<T>`

> **OmitUtils**\<`T`\>: `Omit`\<`T`, keyof [`Utils`](README.md#utils)\>

#### Type parameters

| Parameter |
| :------ |
| `T` |

***

### Environment

> **Environment**: `"dev"` \| `"staging"` \| `"prod"` \| `"experiment"`

***

### PageInfo

> **PageInfo**: `object`

#### Type declaration

##### hasNextPage

> **hasNextPage**: `boolean`

##### startCursor

> **startCursor**: `string`

##### endCursor

> **endCursor**: `string`

***

### PaginatedResponse`<T>`

> **PaginatedResponse**\<`T`\>: `object`

#### Type parameters

| Parameter |
| :------ |
| `T` |

#### Type declaration

##### data

> **data**: `T`[]

##### pageInfo

> **pageInfo**: [`PageInfo`](README.md#pageinfo)

***

### ScoreType

> **ScoreType**: `"HUMAN"` \| `"AI"`

***

### ScoreConstructor

> **ScoreConstructor**: [`OmitUtils`](README.md#omitutilst)\<`ScoreFields`\>

***

### CleanThreadFields

> **CleanThreadFields**: [`OmitUtils`](README.md#omitutilst)\<`ThreadFields`\>

***

### ThreadConstructor

> **ThreadConstructor**: `Omit`\<[`CleanThreadFields`](README.md#cleanthreadfields), `"id"`\> & `Partial`\<`Pick`\<[`CleanThreadFields`](README.md#cleanthreadfields), `"id"`\>\>

***

### StepType

> **StepType**: `"assistant_message"` \| `"embedding"` \| `"llm"` \| `"rerank"` \| `"retrieval"` \| `"run"` \| `"system_message"` \| `"tool"` \| `"undefined"` \| `"user_message"`

***

### StepConstructor

> **StepConstructor**: [`OmitUtils`](README.md#omitutilst)\<`StepFields`\>

***

### DatasetType

> **DatasetType**: `"key_value"` \| `"generation"`

***

### DatasetConstructor

> **DatasetConstructor**: [`OmitUtils`](README.md#omitutilst)\<`DatasetFields`\>

***

### DatasetExperimentItemConstructor

> **DatasetExperimentItemConstructor**: [`OmitUtils`](README.md#omitutilst)\<`DatasetExperimentItemFields`\>

***

### PromptConstructor

> **PromptConstructor**: [`OmitUtils`](README.md#omitutilst)\<`PromptFields`\>

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
