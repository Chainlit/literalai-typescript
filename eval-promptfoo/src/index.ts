import { Dataset, IGenerationMessage, LiteralClient } from '@literalai/client';

import promptTemplate_1 from '../promptTemplate_1.json';
import promptTemplate_2 from '../promptTemplate_2.json';
import { evaluateWithPromptfoo } from './promptFooHelpers';
import { runApplication } from './wildlifeAssistant';

const LITERAL_API_KEY = 'my-initial-api-key';
const LITERAL_API_URL = 'http://localhost:3000';

export const client = new LiteralClient(LITERAL_API_KEY, LITERAL_API_URL);

const DATASET_NAME = 'Animal Facts Dataset';
const PROMPT_TEMPLATE_NAME = 'Animal Facts Template';
const MAX_NUMBER_OF_GENERATIONS = 3;

const createDataset = async () => {
  /**
   * Create a prompt template.
   */

  const promptTemplate = await client.api.createPrompt(
    PROMPT_TEMPLATE_NAME,
    promptTemplate_1 as IGenerationMessage[]
  );

  const existingDataset = await client.api.getDataset({
    name: DATASET_NAME
  });

  if (existingDataset) return { dataset: existingDataset, promptTemplate };

  /**
   * Create a dataset.
   */
  const dataset: Dataset = await client.api.createDataset({
    name: DATASET_NAME,
    description: 'Dataset to evaluate our prompt template.',
    type: 'generation'
  });

  /**
   * Small application to create 10 Generations.
   */
  await runApplication(promptTemplate);

  /**
   * Get the generations that were created.
   */
  const generations = (
    await client.api.getGenerations({
      first: MAX_NUMBER_OF_GENERATIONS,
      filters: [
        {
          field: 'promptLineage',
          operator: 'eq',
          value: PROMPT_TEMPLATE_NAME
        }
      ]
    })
  ).data;

  /**
   * Add the generations to the dataset. Adapt the expected output.
   */
  await dataset.addGenerations(generations.map(({ id }) => id));

  return { dataset, promptTemplate };
};

const main = async () => {
  /**
   * Evaluate the prompt template with promptfoo and create experiment on Literal.
   */

  const { dataset, promptTemplate } = await createDataset();

  await evaluateWithPromptfoo(dataset, promptTemplate);

  /**
   * Use another prompt template and evaluate anew.
   * Visualize on Literal.
   */
  const promptTemplateEnhanced = await client.api.createPrompt(
    PROMPT_TEMPLATE_NAME,
    promptTemplate_2 as IGenerationMessage[]
  );

  await evaluateWithPromptfoo(dataset, promptTemplateEnhanced);
};

main();
