import 'dotenv/config';
import OpenAI from 'openai';

import { LiteralClient, User } from '../src';

async function main() {
  const client = new LiteralClient();
  const openai = new OpenAI();
  const syncer = client.openai(openai).assistant.syncer;

  const threadId = 'thread_P5BRCiOgwjGHJx1SMWN2vvpC';

  const user = new User({ identifier: 'foobar', metadata: { name: 'Willy' } });

  await syncer.syncThread(threadId, user);
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
