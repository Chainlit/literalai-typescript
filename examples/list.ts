import 'dotenv/config';

import { Chainlit } from '../src';

async function main() {
  const chainlit = new Chainlit();

  const first = 20;
  const after = undefined;
  const filter = { duration: { operator: 'gt' as const, value: 100000 } };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const shallowThreads = await chainlit.api.listThreads(first, after, filter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const threads = await chainlit.api.exportThreads(after, filter);
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
