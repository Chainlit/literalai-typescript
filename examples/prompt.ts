import 'dotenv/config';

import { LiteralClient } from '../src';

const literalClient = new LiteralClient();

async function main() {
  const prompt = await literalClient.api.getPrompt('');

  console.log(prompt);
}

main();
