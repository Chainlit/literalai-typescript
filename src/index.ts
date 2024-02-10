import { API } from './api';
import instrumentation from './instrumentation';
import openai from './openai';
import { Step, StepConstructor, Thread, ThreadConstructor } from './types';

export * from './types';
export * from './generation';

export class LiteralClient {
  api: API;
  openai: ReturnType<typeof openai>;
  instrumentation: ReturnType<typeof instrumentation>;

  constructor(apiKey?: string, apiUrl?: string) {
    if (!apiKey) {
      apiKey = process.env.LITERAL_API_KEY;
    }

    if (!apiUrl) {
      apiUrl = process.env.LITERAL_API_URL || 'https://cloud.getliteral.ai';
    }

    this.api = new API(apiKey!, apiUrl!);
    this.openai = openai(this);
    this.instrumentation = instrumentation(this);
  }

  thread(data?: ThreadConstructor) {
    return new Thread(this.api, data);
  }

  step(data: StepConstructor) {
    return new Step(this.api, data);
  }

  run(data: Omit<StepConstructor, 'type'>) {
    const runData = { ...data, type: 'run' as const };
    return new Step(this.api, runData);
  }
}
