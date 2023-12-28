import 'dotenv/config';
import OpenAI from 'openai';

import { Chainlit, User } from '../src';

async function main() {
  const chainlit = new Chainlit();
  const openai = new OpenAI();
  const syncer = chainlit.openai(openai).assistant.syncer;

  const threadId = 'thread_P5BRCiOgwjGHJx1SMWN2vvpC';

  const user = new User({ identifier: 'foobar', metadata: { name: 'Willy' } });

  await syncer.syncThread(threadId, user);
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
