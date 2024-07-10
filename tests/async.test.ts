import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<string>();

describe('Async Local Storage', () => {
  it('is supported on this environment', () => {
    storage.run('This is good', async () => {
      const store = await storage.getStore();
      expect(store).toEqual('This is good');
    });
  });
});
