import { LiteralClient } from '..';
import { API } from '../api';
import { Step, StepConstructor } from '../observability/step';

/**
 * Represents a step in a process or workflow, extending the fields and methods from StepFields.
 */
export class ExperimentRun extends Step {
  api: API;
  client: LiteralClient;

  /**
   * Constructs a new ExperimentRun instance.
   * @param api The API instance to be used for sending and managing steps.
   * @param data The initial data for the step, excluding utility properties.
   */
  constructor(
    client: LiteralClient,
    data: StepConstructor,
    ignoreContext?: true
  ) {
    super(client, data, ignoreContext);
    this.client = client;
    this.api = client.api;
  }

  async wrap<Output>(
    cb: (step: Step) => Output | Promise<Output>,
    updateStep?:
      | Partial<StepConstructor>
      | ((output: Output) => Partial<StepConstructor>)
      | ((output: Output) => Promise<Partial<StepConstructor>>)
  ) {
    const originalEnvironment = this.api.environment;
    this.api.environment = 'experiment';

    const currentStore = this.client.store.getStore();
    const output: Output = await this.client.store.run(
      {
        currentThread: currentStore?.currentThread ?? null,
        currentStep: this,
        currentExperimentRunId: this.id ?? null
      },
      async () => {
        try {
          const output = await super.wrap(cb, updateStep);
          return output;
        } finally {
          // Clear the currentExperimentRunId after execution
          const updatedStore = this.client.store.getStore();
          if (updatedStore) {
            updatedStore.currentExperimentRunId = null;
          }
        }
      }
    );

    this.api.environment = originalEnvironment;
    return output;
  }
}
