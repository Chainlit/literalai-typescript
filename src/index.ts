import { API } from './api';
import openai from './openai';
import { Step, StepConstructor } from './types';

export * from './types';

export class Chainlit {
  api: API;
  openai: ReturnType<typeof openai>;

  constructor(apiKey?: string, apiUrl: string = 'https://staging.chainlit.io') {
    if (!apiKey) {
      apiKey = process.env.CHAINLIT_API_KEY;
    }

    this.api = new API(apiKey!, apiUrl!);
    this.openai = openai(this);
  }

  step(data: StepConstructor) {
    return new Step(this.api, data);
  }
}
