import 'dotenv/config';

import { LiteralClient } from '../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient(apiKey, url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Typescript decorators', () => {
  describe('Thread class decorator', () => {
    @client.thread({ name: 'Test Wrappers Thread' }).decorate
    class ThreadWrappedClass {
      async asyncMethod(query: string) {
        return {
          query,
          threadId: client.getCurrentThread()!.id
        };
      }

      method(query: string) {
        return {
          query,
          threadId: client.getCurrentThread()!.id
        };
      }
    }

    it('exposes the thread in async methods', async () => {
      const initialQuery =
        'What is the air speed velocity of an unladen swallow';
      const instance = new ThreadWrappedClass();

      const { query, threadId } = await instance.asyncMethod(initialQuery);
      const thread = await client.api.getThread(threadId);

      await sleep(1000);

      expect(query).toEqual(initialQuery);
      expect(thread!.id).toEqual(threadId);
    });
  });
});
