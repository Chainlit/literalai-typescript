import { API } from './api';
import openai from './openai';
import { Step, StepConstructor, Thread, ThreadConstructor } from './types';

export * from './types';
export * from './generation';

export class LiteralClient {
  api: API;
  openai: ReturnType<typeof openai>;

  constructor(apiKey?: string, apiUrl: string = 'https://cloud.getliteral.ai') {
    if (!apiKey) {
      apiKey = process.env.LITERAL_API_KEY;
    }

    this.api = new API(apiKey!, apiUrl!);
    this.openai = openai(this);
  }

  thread(data: ThreadConstructor) {
    return new Thread(this.api, data);
  }

  step(data: StepConstructor) {
    return new Step(this.api, data);
  }
}
