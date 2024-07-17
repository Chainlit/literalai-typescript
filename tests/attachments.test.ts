import 'dotenv/config';
import { createReadStream, readFileSync } from 'fs';

import { LiteralClient, Thread } from '../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;
if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}
const client = new LiteralClient(apiKey, url);

const filePath = './tests/chainlit-logo.png';
const mime = 'image/png';

describe('Attachments', () => {
  describe('Uploading a file', () => {
    const stream = createReadStream(filePath);
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer;
    const blob = new Blob([buffer]);
    // We wrap the blob in a blob and simulate the structure of a File
    const file = new Blob([blob], { type: 'image/jpeg' });

    let thread: Thread;
    beforeAll(async () => {
      thread = await client.thread({ name: 'Attachment test ' }).upsert();
    });

    it.each([
      { type: 'Stream', content: stream! },
      { type: 'Buffer', content: buffer! },
      { type: 'ArrayBuffer', content: arrayBuffer! },
      { type: 'Blob', content: blob! },
      { type: 'File', content: file! }
    ])('handles $type objects', async function ({ type, content }) {
      const attachment = await client.api.createAttachment({
        content,
        mime,
        name: `Attachment ${type}`,
        metadata: { type }
      });

      const step = await thread
        .step({
          name: `Test ${type}`,
          type: 'run',
          attachments: [attachment]
        })
        .send();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const urlWithoutSignature = attachment.url!.split('X-Amz-Signature')[0];
      const fetchedUrlWithoutSignature =
        attachment.url!.split('X-Amz-Signature')[0];

      const fetchedStep = await client.api.getStep(step.id!);
      expect(fetchedStep?.attachments?.length).toBe(1);
      expect(fetchedStep?.attachments![0].objectKey).toEqual(
        attachment.objectKey
      );
      expect(fetchedStep?.attachments![0].name).toEqual(attachment.name);
      expect(fetchedStep?.attachments![0].metadata).toEqual(
        attachment.metadata
      );
      expect(urlWithoutSignature).toEqual(fetchedUrlWithoutSignature);
    });
  });
});
