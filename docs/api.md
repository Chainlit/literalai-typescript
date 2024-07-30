**@literalai/client**

***

# @literalai/client

## Classes

### LiteralClient

#### Constructors

##### new LiteralClient(options)

> **new LiteralClient**(`options`): [`LiteralClient`](README.md#literalclient)

Initialize a new Literal AI Client.

###### Parameters

▪ **options**: `object`= `{}`

▪ **options.apiKey?**: `string`

The API key to use for the Literal AI API. Defaults to the LITERAL_API_KEY environment variable.

▪ **options.apiUrl?**: `string`

The URL of the Literal AI API. Defaults to the LITERAL_API_URL environment variable.

▪ **options.environment?**: [`Environment`](README.md#environment)

The environment to use for the Literal AI API.

▪ **options.disabled?**: `boolean`

If set to true, no call will be made to the Literal AI API.

###### Returns

[`LiteralClient`](README.md#literalclient)

A new LiteralClient instance.

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

Instrument the OpenAI client to log all generations to the Literal AI API.
Compatible with OpenAI's `chat.completions.create`, `completions.create` and `images.generate` functions.
If you want to add tags or metadata at the call level, you should use the augmented client returned by this function.
Its functions will be augmented with `literalaiTags` and `literalaiMetadata` options.

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

Instrument a Vercel SDK function to log all invocations to the Literal AI API.
It will be augmented with a `literalAiParent` option that allows you to specify a parent step or thread.

###### Param

The function to instrument. This can be Vercel SDK's `generateText` or `streamText` functions.

###### llamaIndex

> **llamaIndex**: `object`

###### llamaIndex.instrument

> **llamaIndex.instrument**: () => `void`

Instrument the LlamaIndex client to log all generations to the Literal AI API.

###### Returns

`void`

###### llamaIndex.withThread

> **llamaIndex.withThread**: \<`R`\>(`thread`, `callback`) => `R`

###### Type parameters

▪ **R**

###### Parameters

▪ **thread**: `Thread`

▪ **callback**: () => `R`

###### Returns

`R`

##### store

> **store**: `AsyncLocalStorage`\<`StoredContext`\> = `storage`

#### Methods

##### thread()

> **thread**(`data`?): `Thread`

Creates a new thread without sending it to the Literal AI API.

###### Parameters

▪ **data?**: `ThreadConstructor`

Optional initial data for the thread.

###### Returns

`Thread`

A new thread instance.

##### step()

> **step**(`data`): `Step`

Creates a new step without sending it to the Literal AI API.

###### Parameters

▪ **data**: `StepConstructor`

Optional initial data for the step.

###### Returns

`Step`

A new step instance.

##### run()

> **run**(`data`): `Step`

Creates a new step with the type set to 'run'.

###### Parameters

▪ **data**: `Omit`\<`StepConstructor`, `"type"`\>

Optional initial data for the step.

###### Returns

`Step`

A new step instance.

##### experimentRun()

> **experimentRun**(`data`?): `ExperimentRun`

Creates a new Experiment Run.

###### Parameters

▪ **data?**: `Omit`\<`StepConstructor`, `"name"` \| `"type"`\>

Optional initial data for the step.

###### Returns

`ExperimentRun`

A new step instance.

##### \_currentThread()

> **\_currentThread**(): `null` \| `Thread`

Returns the current thread from the context or null if none.

###### Returns

`null` \| `Thread`

The current thread, if any.

##### \_currentStep()

> **\_currentStep**(): `null` \| `Step`

Returns the current step from the context or null if none.

###### Returns

`null` \| `Step`

The current step, if any.

##### \_currentExperimentRunId()

> **\_currentExperimentRunId**(): `null` \| `string`

Returns the current experiment from the context or null if none.

###### Returns

`null` \| `string`

The current experiment, if any.

##### getCurrentThread()

> **getCurrentThread**(): `Thread`

Gets the current thread from the context.
WARNING : this will throw if run outside of a thread context.

###### Returns

`Thread`

The current thread, if any.

##### getCurrentStep()

> **getCurrentStep**(): `Step`

Gets the current step from the context.
WARNING : this will throw if run outside of a step context.

###### Returns

`Step`

The current step, if any.

##### getCurrentExperimentRunId()

> **getCurrentExperimentRunId**(): `string`

Gets the current experiment run ID from the context.
WARNING : this will throw if run outside of an experiment context.

###### Returns

`string`

The current experiment, if any.

***

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

[`BaseGeneration`](README.md#basegeneration).[`constructor`](README.md#constructors-1)

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

[`BaseGeneration`](README.md#basegeneration).[`constructor`](README.md#constructors-1)

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

### Utils

Represents a utility class with serialization capabilities.

#### Extended By

- [`User`](README.md#user)
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

## Type Aliases

### OpenAIGlobalOptions

> **OpenAIGlobalOptions**: `object`

#### Type declaration

##### tags

> **tags**?: [`Maybe`](README.md#maybet)\<`string`[]\>

##### metadata

> **metadata**?: [`Maybe`](README.md#maybet)\<`Record`\<`string`, `any`\>\>

***

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

> **PersistedGeneration**: [`Generation`](README.md#generation) & `object`

#### Type declaration

##### id

> **id**: `string`

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

## Functions

### isPlainObject()

> **isPlainObject**(`value`): `value is Record<string, any>`

#### Parameters

▪ **value**: `unknown`

#### Returns

`value is Record<string, any>`

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
