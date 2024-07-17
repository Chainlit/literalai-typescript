import 'dotenv/config';
import { createReadStream, readFileSync } from 'fs';

import { Attachment, LiteralClient, Maybe } from '../src';

const url = process.env.LITERAL_API_URL;
const apiKey = process.env.LITERAL_API_KEY;
if (!url || !apiKey) {
  throw new Error('Missing environment variables');
}
const client = new LiteralClient(apiKey, url);

const filePath = './tests/chainlit-logo.png';
const mime = 'image/png';

function removeVariableParts(url: string) {
  return url.split('X-Amz-Date')[0].split('X-Goog-Date')[0];
}

describe('Attachments', () => {
  describe('Uploading a file', () => {
    const stream = createReadStream(filePath);
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer;
    const blob = new Blob([buffer]);
    // We wrap the blob in a blob and simulate the structure of a File
    const file = new Blob([blob], { type: 'image/jpeg' });

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

      const step = await client
        .run({
          name: `Test ${type}`,
          attachments: [attachment]
        })
        .send();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fetchedStep = await client.api.getStep(step.id!);

      const urlWithoutVariables = removeVariableParts(attachment.url!);
      const fetchedUrlWithoutVariables = removeVariableParts(
        fetchedStep?.attachments![0].url as string
      );

      expect(fetchedStep?.attachments?.length).toBe(1);
      expect(fetchedStep?.attachments![0].objectKey).toEqual(
        attachment.objectKey
      );
      expect(fetchedStep?.attachments![0].name).toEqual(attachment.name);
      expect(fetchedStep?.attachments![0].metadata).toEqual(
        attachment.metadata
      );
      expect(urlWithoutVariables).toEqual(fetchedUrlWithoutVariables);
    });
  });

  describe('Handling context', () => {
    it('attaches the attachment to the step in the context', async () => {
      const stream = createReadStream(filePath);

      let stepId: Maybe<string>;
      let attachment: Maybe<Attachment>;

      await client.run({ name: 'Attachment test ' }).wrap(async () => {
        stepId = client.getCurrentStep().id!;
        attachment = await client.api.createAttachment({
          content: stream!,
          mime,
          name: 'Attachment',
          metadata: { type: 'Stream' }
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fetchedStep = await client.api.getStep(stepId!);

      expect(fetchedStep?.attachments?.length).toBe(1);
      expect(fetchedStep?.attachments![0].id).toEqual(attachment!.id);
    });
  });
});
