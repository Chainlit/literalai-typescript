**@literalai/client**

***

# @literalai/client

## Classes

### LiteralClient

#### Constructors

##### new LiteralClient(options)

> **new LiteralClient**(`options`): [`LiteralClient`](api.md#literalclient)

Initialize a new Literal AI Client.

###### Parameters

▪ **options**: `object`= `{}`

▪ **options.apiKey?**: `string`

The API key to use for the Literal AI API. Defaults to the LITERAL_API_KEY environment variable.

▪ **options.apiUrl?**: `string`

The URL of the Literal AI API. Defaults to the LITERAL_API_URL env var, or https://cloud.getliteral.ai.

▪ **options.environment?**: [`Environment`](api.md#environment)

The environment to use for the Literal AI API.

▪ **options.disabled?**: `boolean`

If set to true, no call will be made to the Literal AI API.

###### Returns

[`LiteralClient`](api.md#literalclient)

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

▪ **options?**: [`OpenAIGlobalOptions`](api.md#openaiglobaloptions)

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

- [`Utils`](api.md#utils)

#### Constructors

##### new BaseGeneration()

> **new BaseGeneration**(): [`BaseGeneration`](api.md#basegeneration)

###### Returns

[`BaseGeneration`](api.md#basegeneration)

###### Inherited from

[`Utils`](api.md#utils).[`constructor`](api.md#constructors-4)

#### Properties

##### promptId

> **promptId**?: `string`

##### provider

> **provider**?: [`Maybe`](api.md#maybet)\<`string`\>

##### model

> **model**?: [`Maybe`](api.md#maybet)\<`string`\>

##### id

> **id**?: [`Maybe`](api.md#maybet)\<`string`\>

##### tags

> **tags**?: [`Maybe`](api.md#maybet)\<`string`[]\>

##### error

> **error**?: [`Maybe`](api.md#maybet)\<`string`\>

##### variables

> **variables**?: [`Maybe`](api.md#maybet)\<`Record`\<`string`, `any`\>\>

##### settings

> **settings**?: [`Maybe`](api.md#maybet)\<[`ILLMSettings`](api.md#illmsettings)\>

##### tools

> **tools**?: [`Maybe`](api.md#maybet)\<[`ITool`](api.md#itool)[]\>

##### tokenCount

> **tokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

##### inputTokenCount

> **inputTokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

##### outputTokenCount

> **outputTokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

##### ttFirstToken

> **ttFirstToken**?: [`Maybe`](api.md#maybet)\<`number`\>

##### tokenThroughputInSeconds

> **tokenThroughputInSeconds**?: [`Maybe`](api.md#maybet)\<`number`\>

##### duration

> **duration**?: [`Maybe`](api.md#maybet)\<`number`\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](api.md#utils).[`serialize`](api.md#serialize-3)

***

### CompletionGeneration

Represents a utility class with serialization capabilities.

#### Extends

- [`BaseGeneration`](api.md#basegeneration)

#### Constructors

##### new CompletionGeneration(data)

> **new CompletionGeneration**(`data`): [`CompletionGeneration`](api.md#completiongeneration)

###### Parameters

▪ **data**: [`OmitUtils`](api.md#omitutilst)\<[`CompletionGeneration`](api.md#completiongeneration)\>

###### Returns

[`CompletionGeneration`](api.md#completiongeneration)

###### Overrides

[`BaseGeneration`](api.md#basegeneration).[`constructor`](api.md#constructors-1)

#### Properties

##### promptId

> **promptId**?: `string`

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`promptId`](api.md#promptid)

##### provider

> **provider**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`provider`](api.md#provider)

##### model

> **model**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`model`](api.md#model)

##### id

> **id**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`id`](api.md#id)

##### tags

> **tags**?: [`Maybe`](api.md#maybet)\<`string`[]\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tags`](api.md#tags)

##### error

> **error**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`error`](api.md#error)

##### variables

> **variables**?: [`Maybe`](api.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`variables`](api.md#variables)

##### settings

> **settings**?: [`Maybe`](api.md#maybet)\<[`ILLMSettings`](api.md#illmsettings)\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`settings`](api.md#settings)

##### tools

> **tools**?: [`Maybe`](api.md#maybet)\<[`ITool`](api.md#itool)[]\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tools`](api.md#tools)

##### tokenCount

> **tokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tokenCount`](api.md#tokencount)

##### inputTokenCount

> **inputTokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`inputTokenCount`](api.md#inputtokencount)

##### outputTokenCount

> **outputTokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`outputTokenCount`](api.md#outputtokencount)

##### ttFirstToken

> **ttFirstToken**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`ttFirstToken`](api.md#ttfirsttoken)

##### tokenThroughputInSeconds

> **tokenThroughputInSeconds**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tokenThroughputInSeconds`](api.md#tokenthroughputinseconds)

##### duration

> **duration**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`duration`](api.md#duration)

##### type

> **type**?: [`GenerationType`](api.md#generationtype) = `'COMPLETION'`

##### prompt

> **prompt**?: [`Maybe`](api.md#maybet)\<`string`\>

##### completion

> **completion**?: [`Maybe`](api.md#maybet)\<`string`\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`serialize`](api.md#serialize)

***

### ChatGeneration

Represents a utility class with serialization capabilities.

#### Extends

- [`BaseGeneration`](api.md#basegeneration)

#### Constructors

##### new ChatGeneration(data)

> **new ChatGeneration**(`data`): [`ChatGeneration`](api.md#chatgeneration)

###### Parameters

▪ **data**: [`OmitUtils`](api.md#omitutilst)\<[`ChatGeneration`](api.md#chatgeneration)\>

###### Returns

[`ChatGeneration`](api.md#chatgeneration)

###### Overrides

[`BaseGeneration`](api.md#basegeneration).[`constructor`](api.md#constructors-1)

#### Properties

##### promptId

> **promptId**?: `string`

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`promptId`](api.md#promptid)

##### provider

> **provider**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`provider`](api.md#provider)

##### model

> **model**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`model`](api.md#model)

##### id

> **id**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`id`](api.md#id)

##### tags

> **tags**?: [`Maybe`](api.md#maybet)\<`string`[]\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tags`](api.md#tags)

##### error

> **error**?: [`Maybe`](api.md#maybet)\<`string`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`error`](api.md#error)

##### variables

> **variables**?: [`Maybe`](api.md#maybet)\<`Record`\<`string`, `any`\>\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`variables`](api.md#variables)

##### settings

> **settings**?: [`Maybe`](api.md#maybet)\<[`ILLMSettings`](api.md#illmsettings)\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`settings`](api.md#settings)

##### tools

> **tools**?: [`Maybe`](api.md#maybet)\<[`ITool`](api.md#itool)[]\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tools`](api.md#tools)

##### tokenCount

> **tokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tokenCount`](api.md#tokencount)

##### inputTokenCount

> **inputTokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`inputTokenCount`](api.md#inputtokencount)

##### outputTokenCount

> **outputTokenCount**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`outputTokenCount`](api.md#outputtokencount)

##### ttFirstToken

> **ttFirstToken**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`ttFirstToken`](api.md#ttfirsttoken)

##### tokenThroughputInSeconds

> **tokenThroughputInSeconds**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`tokenThroughputInSeconds`](api.md#tokenthroughputinseconds)

##### duration

> **duration**?: [`Maybe`](api.md#maybet)\<`number`\>

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`duration`](api.md#duration)

##### type

> **type**?: [`GenerationType`](api.md#generationtype) = `'CHAT'`

##### messages

> **messages**?: [`Maybe`](api.md#maybet)\<[`IGenerationMessage`](api.md#igenerationmessage)[]\> = `[]`

##### messageCompletion

> **messageCompletion**?: [`Maybe`](api.md#maybet)\<[`IGenerationMessage`](api.md#igenerationmessage)\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`BaseGeneration`](api.md#basegeneration).[`serialize`](api.md#serialize)

***

### Utils

Represents a utility class with serialization capabilities.

#### Extended By

- [`User`](api.md#user)
- [`BaseGeneration`](api.md#basegeneration)

#### Constructors

##### new Utils()

> **new Utils**(): [`Utils`](api.md#utils)

###### Returns

[`Utils`](api.md#utils)

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

- [`Utils`](api.md#utils)

#### Constructors

##### new User(data)

> **new User**(`data`): [`User`](api.md#user)

###### Parameters

▪ **data**: [`OmitUtils`](api.md#omitutilst)\<[`User`](api.md#user)\>

###### Returns

[`User`](api.md#user)

###### Overrides

[`Utils`](api.md#utils).[`constructor`](api.md#constructors-4)

#### Properties

##### id

> **id**?: [`Maybe`](api.md#maybet)\<`string`\>

##### identifier

> **identifier**: `string`

##### metadata

> **metadata**?: [`Maybe`](api.md#maybet)\<`Record`\<`string`, `any`\>\>

#### Methods

##### serialize()

> **serialize**(): `any`

Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
It handles nested objects that also implement a serialize method.

###### Returns

`any`

A dictionary representing the serialized properties of the object.

###### Inherited from

[`Utils`](api.md#utils).[`serialize`](api.md#serialize-3)

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

> **content**: `null` \| `string` \| ([`ITextContent`](api.md#itextcontent) \| [`IImageUrlContent`](api.md#iimageurlcontent))[]

##### role

> **role**: [`GenerationMessageRole`](api.md#generationmessagerole)

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

> **function**: [`IFunction`](api.md#ifunction)

## Type Aliases

### OpenAIGlobalOptions

> **OpenAIGlobalOptions**: `object`

#### Type declaration

##### tags

> **tags**?: [`Maybe`](api.md#maybet)\<`string`[]\>

##### metadata

> **metadata**?: [`Maybe`](api.md#maybet)\<`Record`\<`string`, `any`\>\>

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

> **Generation**: [`OmitUtils`](api.md#omitutilst)\<[`CompletionGeneration`](api.md#completiongeneration)\> \| [`OmitUtils`](api.md#omitutilst)\<[`ChatGeneration`](api.md#chatgeneration)\>

***

### PersistedGeneration

> **PersistedGeneration**: [`Generation`](api.md#generation) & `object`

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

> **OmitUtils**\<`T`\>: `Omit`\<`T`, keyof [`Utils`](api.md#utils)\>

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

> **pageInfo**: [`PageInfo`](api.md#pageinfo)

## Functions

### isPlainObject()

> **isPlainObject**(`value`): `value is Record<string, any>`

#### Parameters

▪ **value**: `unknown`

#### Returns

`value is Record<string, any>`

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
