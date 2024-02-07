import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';

import { LiteralClient } from '../src';

async function main() {
  const client = new LiteralClient();

  // Create the thread
  const thread = await client.thread().upsert();

  const promptTemplate =
    PromptTemplate.fromTemplate(`Given the user question below, classify it as either being about \`LangChain\`, \`Anthropic\`, or \`Other\`.
                                     
Do not respond with more than one word.

<question>
{question}
</question>

Classification:`);

  const model = new ChatOpenAI({
    streaming: true
  });

  const classificationChain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser()
  ]);

  await classificationChain.invoke(
    {
      question: 'how do I call Anthropic?'
    },
    {
      callbacks: [
        await client.instrumentation.langchain.literalCallback(thread.id)
      ]
    }
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
