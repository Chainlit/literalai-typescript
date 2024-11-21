import { API } from '../src/api';
import { sharedCache } from '../src/cache/sharedcache';
import { getPromptCacheKey, putPrompt } from '../src/cache/utils';
import { Prompt, PromptConstructor } from '../src/prompt-engineering/prompt';

describe('Cache', () => {
  let api: API;
  let mockPrompt: Prompt;

  beforeAll(() => {
    api = {} as API;
  });

  beforeEach(() => {
    sharedCache.clear();

    const mockPromptData: PromptConstructor = {
      id: 'test-id',
      type: 'CHAT',
      createdAt: '2023-01-01T00:00:00Z',
      name: 'test-name',
      version: 1,
      metadata: {},
      items: [],
      templateMessages: [{ role: 'user', content: 'Hello', uuid: '123' }],
      provider: 'test-provider',
      settings: {
        provider: 'test-provider',
        model: 'test-model',
        frequency_penalty: 0,
        max_tokens: 100,
        presence_penalty: 0,
        temperature: 0.7,
        top_p: 1
      },
      variables: []
    };
    mockPrompt = new Prompt(api, mockPromptData);
  });

  describe('Cache Utils', () => {
    describe('getPromptCacheKey', () => {
      it('should return id when provided', () => {
        const key = getPromptCacheKey({
          id: 'test-id',
          name: 'test-name',
          version: 1
        });
        expect(key).toBe('test-id');
      });

      it('should return name:version when id not provided but name and version are', () => {
        const key = getPromptCacheKey({
          name: 'test-name',
          version: 1
        });
        expect(key).toBe('test-name:1');
      });

      it('should return name when only name provided', () => {
        const key = getPromptCacheKey({ name: 'test-name' });
        expect(key).toBe('test-name');
      });

      it('should throw error when neither id nor name provided', () => {
        expect(() => getPromptCacheKey({ version: 0 })).toThrow(
          'Either id or name must be provided'
        );
      });
    });

    describe('putPrompt', () => {
      it('should store prompt with multiple keys', () => {
        putPrompt(mockPrompt);

        expect(sharedCache.get('test-id')).toEqual(mockPrompt);
        expect(sharedCache.get('test-name')).toEqual(mockPrompt);
        expect(sharedCache.get('test-name:1')).toEqual(mockPrompt);
      });
    });
  });

  describe('SharedCache', () => {
    it('should return undefined for non-existent key', () => {
      const value = sharedCache.get('non-existent');
      expect(value).toBeUndefined();
    });

    it('should store and retrieve values', () => {
      sharedCache.put('test-key', 'test-value');
      expect(sharedCache.get('test-key')).toBe('test-value');
    });

    it('should clear all values', () => {
      sharedCache.put('key1', 'value1');
      sharedCache.put('key2', 'value2');

      sharedCache.clear();

      expect(sharedCache.get('key1')).toBeUndefined();
      expect(sharedCache.get('key2')).toBeUndefined();
    });

    it('should maintain singleton behavior', () => {
      const instance1 = sharedCache;
      const instance2 = sharedCache;

      instance1.put('test', 'value');
      expect(instance2.get('test')).toBe('value');
      expect(instance1).toBe(instance2);
    });

    it('should expose cache map', () => {
      sharedCache.put('test', 'value');
      const cacheMap = sharedCache.getCache();

      expect(cacheMap instanceof Map).toBe(true);
      expect(cacheMap.get('test')).toBe('value');
    });
  });
});
