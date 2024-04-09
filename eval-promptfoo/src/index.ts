import { Dataset } from '@literalai/client';
import { LiteralClient } from '@literalai/client';

import promptTemplate_1 from '../promptTemplate_1.json';
import promptTemplate_2 from '../promptTemplate_2.json';
import { evaluateWithPromptfoo } from './promptFooHelpers';
import { runApplication } from './wildlifeAssistant';

const LITERAL_API_KEY = 'my-initial-api-key';
const LITERAL_API_URL = 'http://localhost:3001';

const client = new LiteralClient(LITERAL_API_KEY, LITERAL_API_URL);

const PROMPT_TEMPLATE_NAME = 'Animal Facts Template 6';

const main = async () => {
  /**
   * Create a dataset.
   */
  const dataset: Dataset = await client.api.createDataset({
    name: `Prompt ${new Date().toISOString()}`,
    description: 'Dataset to evaluate our prompt template.',
    type: 'generation'
  });

  /**
   * Create a prompt template.
   */
  const promptTemplate = await client.api.createPrompt(
    PROMPT_TEMPLATE_NAME,
    promptTemplate_1 as any
  );

  /**
   * Small application to create 10 Generations.
   */
  await runApplication(promptTemplate);

  /**
   * Get the generations that were created.
   */
  const generations = (
    await client.api.getGenerations({
      filters: [
        {
          field: 'promptLineage',
          operator: 'eq',
          value: PROMPT_TEMPLATE_NAME
        }
      ]
    })
  ).data.slice(0, 3);

  /**
   * Add the generations to the dataset. Adapt the expected output.
   */
  await dataset.addGenerations(generations.map(({ id }) => id as string));

  /**
   * Evaluate the prompt template with promptfoo and create experiment on Literal.
   */
  await evaluateWithPromptfoo(dataset, promptTemplate);

  /**
   * Use another prompt template and evaluate anew.
   * Visualize on Literal.
   */
  const promptTemplateEnhanced = await client.api.createPrompt(
    PROMPT_TEMPLATE_NAME,
    promptTemplate_2 as any
  );

  await evaluateWithPromptfoo(dataset, promptTemplateEnhanced);
};

main();
