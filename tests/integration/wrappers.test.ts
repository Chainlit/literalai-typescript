import 'dotenv/config';

import { LiteralClient } from '../../src';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Wrapper', () => {
  let client: LiteralClient;

  beforeAll(function () {
    const url = process.env.LITERAL_API_URL;
    const apiKey = process.env.LITERAL_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new LiteralClient(apiKey, url);
  });

  it('should handle simple use case', async () => {
    const retrieve = client.wrapInStep(
      async (_query: string) => {
        await sleep(1000);
        return [
          { score: 0.8, text: 'France is a country in Europe' },
          { score: 0.7, text: 'Paris is the capital of France' }
        ];
      },
      {
        step: {
          name: 'Retrieve',
          type: 'retrieval'
        }
      }
    );

    const completion = client.wrapInStep(
      async (_query: string, _augmentations: string[]) => {
        await sleep(1000);
        return { content: 'Paris is a city in Europe' };
      },
      {
        step: {
          name: 'Completion',
          type: 'llm'
        }
      }
    );

    const main = client.wrapInThread(
      async (query: string) => {
        const results = await retrieve(query);
        const augmentations = results.map((result) => result.text);
        const completionText = await completion(query, augmentations);
        return completionText.content;
      },
      {
        thread: {
          name: 'Test Wrappers'
        },
        run: {
          name: 'Run',
          type: 'run'
        }
      }
    );

    const result = await main('France');
    expect(result).toBe('Paris is a city in Europe');
  });

  it('should handle nest steps', async () => {
    // TODO: Implement
    fail('Not implemented');
  });

  it('should handle steps outside of a thread', async () => {
    // TODO: Implement
    fail('Not implemented');
  });

  it('should handle failing step', async () => {
    // TODO: Implement
    fail('Not implemented');
  });
});
