import 'dotenv/config';

import { LiteralClient } from '../src';

async function main() {
  const client = new LiteralClient();

  // const first = 20;
  // const after = undefined;
  const filter = {
    createdAt: { operator: 'lt' as const, value: new Date().toISOString() }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const shallowThreads = await client.api.listThreads(first, after, filter);

  const page = 1;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const threads = await client.api.exportThreads(page, filter);
  console.log(threads);
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
