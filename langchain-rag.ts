import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  RunnablePassthrough,
  RunnableSequence
} from '@langchain/core/runnables';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';
import { formatDocumentsAsString } from 'langchain/util/document';

import { LiteralClient } from './src';

const literalClient = new LiteralClient();
const cb = literalClient.instrumentation.langchain.literalCallback();

const model = new ChatOpenAI({});

async function main() {
  const literalaiStepId = '4defe177-334e-457f-8365-f34ad5ba84b3';
  const firstResponse = await model.invoke('Hello, how are you?', {
    callbacks: [cb],
    metadata: {
      test: 'yes',
      helicopter: 'you mean helicoptell',
      literalaiStepId
    },
    tags: ['bim', 'bam', 'boom']
  });

  await literalClient.api.createScore({
    stepId: literalaiStepId,
    name: 'Toxicity',
    type: 'HUMAN',
    comment: 'The answer is pretty nice',
    value: 0
  });

  console.log(firstResponse);

  await literalClient;

  const vectorStore = await HNSWLib.fromTexts(
    ['mitochondria is the powerhouse of the cell'],
    [{ id: 1 }],
    new OpenAIEmbeddings()
  );
  const retriever = vectorStore.asRetriever();

  const prompt =
    PromptTemplate.fromTemplate(`Answer the question based only on the following context:
{context}

Question: {question}`);

  const chain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString) as any,
      question: new RunnablePassthrough()
    },
    prompt,
    model,
    new StringOutputParser()
  ]);

  const newLiteralaiStepId = '94059657-3a31-4682-8f9a-33ce019ea027';

  await literalClient.api.createScore({
    stepId: newLiteralaiStepId,
    name: 'Toxicity',
    type: 'HUMAN',
    comment: 'wow what a douche',
    value: 1
  });

  const result = await chain.invoke('What is the powerhouse of the cell?', {
    callbacks: [cb],
    runName: 'Standalone RAG Run',
    metadata: {
      test: 'yes',
      helicopter: 'you mean helicoptell',
      literalaiStepId: newLiteralaiStepId
    },
    tags: ['bim', 'bam', 'boom'],
    configurable: { thread_id: 'test_thread_id' }
  });

  console.log(result);

  await literalClient.thread({ name: 'Test RAG Thread' }).wrap(async () => {
    const result = await chain.invoke('What is the powerhouse of the cell?', {
      callbacks: [cb]
    });

    console.log(result);
  });

  await literalClient.run({ name: 'Test RAG Run' }).wrap(async () => {
    const result = await chain.invoke('What is the powerhouse of the cell?', {
      callbacks: [cb]
    });

    console.log(result);

    const result2 = await chain.invoke(
      'What is the air-speed velocity of an unladen swallow?',
      {
        callbacks: [cb]
      }
    );

    console.log(result2);
  });
}

main();
