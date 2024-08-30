import 'dotenv/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

import { LiteralClient } from './src';

const openai = new OpenAI();

const literalClient = new LiteralClient();
// Instrument the OpenAI client
const openai_ = literalClient.instrumentation.openai({ client: openai });

async function main() {
  const response = await openai_.chat.completions.create(
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say this is a test' }]
    },
    {
      literalaiStepId: uuidv4()
    }
  );

  await openai_.chat.completions.create(
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say this is a test' }]
    },
    {
      literalaiStepId: uuidv4()
    }
  );

  await openai_.chat.completions.create(
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say this is a test' }]
    },
    {
      literalaiStepId: uuidv4()
    }
  );

  // const embedding = await openai.embeddings?.create({
  //   model: 'text-embedding-3-large',
  //   input: 'This is a test'
  // });
  console.log(response);
  // console.log(JSON.stringify(response, null, 2));
  // console.log(JSON.stringify(embedding, null, 2));
}

main();
