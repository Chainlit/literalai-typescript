import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

import { LiteralClient } from '../../src';
import { sleep } from '../utils';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;

if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}

const client = new LiteralClient({ apiKey, apiUrl: url });
const cb = client.instrumentation.langchain.literalCallback();

describe.skip('Langchain integration', function () {
  it('should create a generation with the provided id', async function () {
    const literalaiStepId = uuidv4();
    const model = new ChatOpenAI({});

    await model.invoke('Hello, how are you?', {
      callbacks: [cb],
      metadata: { literalaiStepId }
    });

    await sleep(1000);

    const step = await client.api.getStep(literalaiStepId);

    expect(step!.type).toBe('llm');
  });

  it('should copy tags and metadata to the generation', async function () {
    const literalaiStepId = uuidv4();
    const model = new ChatOpenAI({});

    const metadata = {
      framework: 'Langchain',
      awesome: 'yes',
      literalaiStepId
    };

    const tags = ['bim', 'bam', 'boom'];

    await model.invoke('Hello, how are you?', {
      callbacks: [cb],
      metadata,
      tags
    });

    await sleep(1000);

    const step = await client.api.getStep(literalaiStepId);

    expect(step!.metadata).toEqual(expect.objectContaining(metadata));
    expect(step!.tags).toEqual(expect.arrayContaining(tags));
  });
});
