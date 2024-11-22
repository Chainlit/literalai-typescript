import { sharedCache } from '../src/cache/sharedcache';
import { getPromptCacheKey } from '../src/cache/utils';

describe('Cache', () => {
  beforeEach(() => {
    sharedCache.clear();
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
