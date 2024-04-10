import promptfoo, {
  Assertion,
  EvaluateResult,
  EvaluateTestSuite,
  TestCase
} from 'promptfoo';

import {
  Dataset,
  DatasetExperimentItem,
  Prompt,
  Score
} from '@literalai/client';

/**
 * Evaluate a dataset against a prompt template.
 */
export async function evaluateWithPromptfoo(
  dataset: Dataset,
  promptTemplate: Prompt
) {
  const assertions = [
    {
      type: 'similar',
      value: '{{expectedOutput}}',
      provider: { id: 'openai:gpt-3.5-turbo' }
    }
  ] as Assertion[];

  // Test cases checking similarity between expected & reached output embeddings.
  const testCases: TestCase[] = dataset?.items.map((item) => {
    return {
      vars: {
        ...item.metadata?.variables,
        expectedOutput: item.expectedOutput?.content
      },
      assert: [
        {
          type: 'similar',
          value: '{{expectedOutput}}',
          provider: 'openai:gpt-3.5-turbo'
        }
      ] as Assertion[]
    };
  });

  // Evaluate suite on our prompt template for the GPT-3.5-turbo provider.
  const testSuite: EvaluateTestSuite = {
    prompts: [({ vars }: any) => promptTemplate.format(vars)] as any,
    providers: ['openai:gpt-3.5-turbo'],
    tests: testCases
  };

  const results = (await promptfoo.evaluate(testSuite)).results;

  return addExperimentToLiteral(
    dataset,
    promptTemplate.id,
    assertions,
    results
  );
}

export async function addExperimentToLiteral(
  dataset: Dataset,
  promptId: string,
  assertions: Assertion[],
  results: EvaluateResult[]
) {
  const datasetExperiment = await dataset.createExperiment({
    name: 'Similarity Experiment',
    promptId,
    assertions
  });

  // For each dataset item.
  results.forEach(async (result, index) => {
    // Create corresponding Score objects.
    const scores = result.gradingResult?.componentResults?.map(
      (componentResult) =>
        new Score({
          name: componentResult.assertion?.type || 'N/A',
          value: componentResult.score,
          comment: componentResult.reason,
          type: 'AI'
        })
    );

    // Log an experiment item.
    datasetExperiment.log(
      new DatasetExperimentItem({
        datasetExperimentId: datasetExperiment.id,
        datasetItemId: dataset.items[index].id,
        scores: scores || []
      })
    );
  });
  return datasetExperiment;
}
