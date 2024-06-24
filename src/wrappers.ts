import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  LiteralClient,
  Step,
  StepConstructor,
  ThreadConstructor
} from './index';

const storage = new AsyncLocalStorage<Step>();

export type StepWrapperOptions = {
  step: StepConstructor;
};

export const wrapInStep =
  <TArgs extends unknown[], TReturn>(
    client: LiteralClient,
    fn: (...args: TArgs) => Promise<TReturn>,
    options: StepWrapperOptions
  ) =>
  async (...args: TArgs): Promise<TReturn> => {
    const parentStep = storage.getStore();
    const step = parentStep
      ? parentStep.step(options.step)
      : client.step({ ...options.step, type: 'run' });

    const startTime = new Date();
    const result = await storage.run(step, () => fn(...args));

    step.input = { inputs: args };
    step.output = { output: result };
    step.startTime = startTime.toISOString();
    step.endTime = new Date().toISOString();
    await step.send();

    return result;
  };

export type ThreadWrapperOptions<TArgs extends unknown[]> = {
  thread: Omit<ThreadConstructor, 'id'> & {
    id?: (...args: TArgs) => string;
  };
  run: StepConstructor;
};

export const wrapInThread =
  <TArgs extends unknown[], TReturn>(
    client: LiteralClient,
    fn: (...args: TArgs) => Promise<TReturn>,
    options: ThreadWrapperOptions<TArgs>
  ) =>
  async (...args: TArgs): Promise<TReturn> => {
    const { id, ...threadOptions } = options.thread;
    const thread = await client
      .thread({ ...threadOptions, id: id?.(...args) })
      .upsert();
    const runStep = thread.step(options.run);

    const startTime = new Date();
    const result = await storage.run(runStep, () => fn(...args));

    runStep.input = { inputs: args };
    runStep.output = { output: result };
    runStep.startTime = startTime.toISOString();
    runStep.endTime = new Date().toISOString();
    await runStep.send();

    return result;
  };
