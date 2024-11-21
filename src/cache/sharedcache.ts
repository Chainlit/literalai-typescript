const cache: Map<string, any> = new Map();

class SharedCache {
  private static instance: SharedCache;

  public constructor() {
    if (SharedCache.instance) {
      throw new Error('SharedCache can only be created once');
    }
    SharedCache.instance = this;
  }

  public getInstance(): SharedCache {
    return this;
  }

  public getCache(): Map<string, any> {
    return cache;
  }

  public get(key: string): any {
    return cache.get(key);
  }

  public put(key: string, value: any): void {
    cache.set(key, value);
  }

  public clear(): void {
    cache.clear();
  }
}

export const sharedCache = new SharedCache();

export default sharedCache;
