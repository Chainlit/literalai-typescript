import OpenAI from "openai";
import { API } from "./api";
import { OpenAIAssistantSyncer } from "./openai";
export * from "./types";

export class Chainlit {
  api: API;

  constructor(apiKey?: string, apiUrl: string = "https://staging.chainlit.io") {
    if (!apiKey) {
      apiKey = process.env.CHAINLIT_API_KEY;
    }

    this.api = new API(apiKey!, apiUrl!);
  }

  openaiAssistantSyncer(openai: OpenAI) {
    return new OpenAIAssistantSyncer(openai, this.api);
  }
}
