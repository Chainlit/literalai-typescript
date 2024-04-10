import promptfoo, {
  Assertion,
  EvaluateResult,
  EvaluateTestSuite,
  TestCase
} from 'promptfoo';

import { Dataset, Prompt, Score } from '@literalai/client';

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
      value: '{{expectedOutput}}'
    }
  ] as Assertion[];

  // Test cases checking similarity between expected & reached output embeddings.
  const testCases: TestCase[] = dataset?.items.map((item) => {
    const promptVariables = item.metadata?.variables;
    const expectedOutput = item.expectedOutput?.content;
    return {
      vars: {
        ...promptVariables,
        expectedOutput
      },
      assert: assertions
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
      (componentResult) => {
        return new Score({
          name: componentResult.assertion?.type || 'N/A',
          value: componentResult.score,
          comment: componentResult.reason,
          scorer: componentResult.assertion?.provider?.toString(),
          type: 'AI'
        });
      }
    );

    // Log an experiment item.
    datasetExperiment.log({
      datasetItemId: dataset.items[index].id,
      input: { content: result.prompt.raw },
      output: { content: result.response?.output },
      scores: scores || []
    });
  });
  return datasetExperiment;
}
