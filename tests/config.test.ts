import { LiteralClient } from '../src';

describe('Literal Ai Config', () => {
  it('should not throw when disabled', () => {
    let client: LiteralClient | undefined;
    expect(() => {
      client = new LiteralClient(undefined, undefined, true);
    }).not.toThrow();

    expect(client).toBeDefined();

    // HACK: This is to access private properties
    const { url, apiKey, disabled } = client!.api as any;
    expect(url).toBe('https://cloud.getliteral.ai');
    expect(apiKey).toBe(undefined);
    expect(disabled).toBe(true);
  });

  it('should not throw when keys given', () => {
    let client: LiteralClient | undefined;
    expect(() => {
      client = new LiteralClient('KEY', 'URL');
    }).not.toThrow();

    expect(client).toBeDefined();

    // HACK: This is to access private properties
    const { url, apiKey, disabled } = client!.api as any;
    expect(url).toBe('URL');
    expect(apiKey).toBe('KEY');
    expect(disabled).toBe(false);
  });

  it('should not throw when keys are in env', () => {
    process.env.LITERAL_API_URL = 'URL';
    process.env.LITERAL_API_KEY = 'KEY';

    let client: LiteralClient | undefined;
    expect(() => {
      client = new LiteralClient('KEY', 'URL');
    }).not.toThrow();

    delete process.env.LITERAL_API_URL;
    delete process.env.LITERAL_API_KEY;

    expect(client).toBeDefined();

    // HACK: This is to access private properties
    const { url, apiKey, disabled } = client!.api as any;
    expect(url).toBe('URL');
    expect(apiKey).toBe('KEY');
    expect(disabled).toBe(false);
  });

  it('should throw when no keys given or found', () => {
    let client: LiteralClient | undefined;
    expect(() => {
      client = new LiteralClient();
    }).toThrow();

    expect(client).toBeUndefined();
  });
});
