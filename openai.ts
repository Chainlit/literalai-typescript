import 'dotenv/config';
import OpenAI from 'openai';

import { LiteralClient } from './src';

const literalClient = new LiteralClient();

const _openai = new OpenAI();

// Instrument the OpenAI client
const openai = literalClient.instrumentation.openai({
  client: _openai
});

console.log(openai);

async function main() {
  const response = await openai.chat.completions.create(
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say this is a test' }]
    },
    {
      headers: {
        'x-literalai-tags': 'openai,chat'
      },
      literalaiTags: ['openai', 'chat'],
      literalaiMetadata: { tags: ['openai', 'chat'] }
    }
  );

  const embedding = await openai.embeddings?.create({
    model: 'text-embedding-3-large',
    input: 'This is a test'
  });

  console.log(JSON.stringify(response, null, 2));
  console.log(JSON.stringify(embedding, null, 2));
}

main();
