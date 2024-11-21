import { Prompt } from '../prompt-engineering/prompt';
import { sharedCache } from './sharedcache';

export class PromptCacheManager {
  public static getPromptCacheKey({
    id,
    name,
    version
  }: {
    id?: string;
    name?: string;
    version?: number;
  }): string {
    if (id) {
      return id;
    } else if (name && typeof version === 'number') {
      return `${name}:${version}`;
    } else if (name) {
      return name;
    }
    throw new Error('Either id or name must be provided');
  }

  public static putPrompt(prompt: Prompt): void {
    sharedCache.put(prompt.id, prompt);
    sharedCache.put(prompt.name, prompt);
    sharedCache.put(`${prompt.name}:${prompt.version}`, prompt);
  }
}
