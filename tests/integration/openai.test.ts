import 'dotenv/config';
import OpenAI from 'openai';

import { LiteralClient } from '../../src';

// Skip for the CI
describe.skip('OpenAI Instrumentation', () => {
  let client: LiteralClient;

  beforeAll(function () {
    const url = process.env.LITERAL_API_URL;
    const apiKey = process.env.LITERAL_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Missing environment variables');
    }

    client = new LiteralClient(apiKey, url);
  });

  it('should monitor simple generation', async () => {
    const spy = jest.spyOn(client.api, 'createGeneration');

    const openai = new OpenAI();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of Canada?' }
      ]
    });

    await client.instrumentation.openai(response);

    expect(response.choices[0].message.content).toBeTruthy();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHAT',
        provider: 'openai',
        model: 'gpt-3.5-turbo-0125',
        messages: [
          { content: 'You are a helpful assistant.', role: 'system' },
          { content: 'What is the capital of Canada?', role: 'user' }
        ],
        messageCompletion: response.choices[0].message,
        tokenCount: expect.any(Number)
      })
    );
  });

  it('should monitor streamed generation', async () => {
    const spy = jest.spyOn(client.api, 'createGeneration');

    const openai = new OpenAI();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of Switzerland?' }
      ],
      stream: true
    });

    await client.instrumentation.openai(response);

    let resultText = '';
    // use stream as an async iterable:
    for await (const chunk of response) {
      resultText += chunk.choices[0].delta.content ?? '';
    }

    expect(resultText).toBeTruthy();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHAT',
        provider: 'openai',
        model: 'gpt-3.5-turbo-0125',
        messages: [
          { content: 'You are a helpful assistant.', role: 'system' },
          { content: 'What is the capital of Switzerland?', role: 'user' }
        ],
        messageCompletion: {
          role: 'assistant',
          content: resultText
        },
        duration: expect.any(Number),
        ttFirstToken: expect.any(Number),
        outputTokenCount: expect.any(Number),
        tokenThroughputInSeconds: expect.any(Number)
      })
    );
  });

  it('should monitor image generation', async () => {
    const spy = jest.spyOn(client.api, 'sendSteps');

    const openai = new OpenAI();

    const response = await openai.images.generate({
      prompt: 'A painting of a rose in the style of Picasso.',
      model: 'dall-e-2',
      size: '256x256',
      n: 1
    });

    await client.instrumentation.openai(response);

    expect(response.data[0].url).toBeTruthy();

    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'dall-e-2',
          type: 'run',
          input: {
            model: 'dall-e-2',
            prompt: 'A painting of a rose in the style of Picasso.',
            size: '256x256',
            n: 1
          },
          output: response
        })
      ])
    );
  });
});
