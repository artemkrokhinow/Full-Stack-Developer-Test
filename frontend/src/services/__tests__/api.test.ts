import { apiFetch, ApiError } from '../api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('apiFetch error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws ApiError on non-ok HTTP responses', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Bad Request' }),
    };
    (globalThis.fetch as any).mockResolvedValue(mockResponse);

    await expect(apiFetch('/test')).rejects.toThrow(ApiError);
    await expect(apiFetch('/test')).rejects.toThrow('Bad Request');
  });

  it('throws timeout ApiError when AbortError occurs', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    (globalThis.fetch as any).mockRejectedValue(abortError);

    await expect(apiFetch('/test')).rejects.toThrow(ApiError);
    await expect(apiFetch('/test')).rejects.toThrow('Request timed out');
  });

});
