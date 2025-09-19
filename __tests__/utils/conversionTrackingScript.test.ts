/* @vitest-environment jsdom */
/**
 * Unit tests for conversionTrackingScript
 * @group utils
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Ensure the module is loaded fresh each test to re-run IIFE and listeners
async function importFresh() {
  vi.resetModules();
  return await import('../../src/utils/conversionTrackingScript');
}

describe('utils/conversionTrackingScript', () => {
  beforeEach(() => {
    // Reset DOM URL and localStorage
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/'),
      writable: true,
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns false when no tracking id present', async () => {
    await importFresh();
    const fetchSpy = vi.spyOn(window, 'fetch');

    const result = window.trackCylinkConversion();
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stores tracking id from UTM and sends payload', async () => {
    // Prepare URL with UTM params
    Object.defineProperty(window, 'location', {
      value: new URL(
        'https://example.com/?utm_source=cylink&utm_medium=shortlink&utm_campaign=conversion&utm_content=TRACK123',
      ),
      writable: true,
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, success: true }), {
        status: 200,
      }) as unknown as Response,
    );

    await importFresh();

    // DOMContentLoaded handler stores tracking id
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const onSuccess = vi.fn();
    const ok = window.trackCylinkConversion({ onSuccess });
    expect(ok).toBe(true);

    // Verify fetch called with default API and payload
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://cylink.id/api/v1/conversions');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(String(init.body));
    expect(body.tracking_id).toBe('TRACK123');

    // Wait until the async chain calls onSuccess
    await vi.waitUntil(() => onSuccess.mock.calls.length > 0);
  });

  it('uses cyt fallback parameter', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/?cyt=FALLBACK123'),
      writable: true,
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, success: true }), {
        status: 200,
      }) as unknown as Response,
    );

    await importFresh();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const ok = window.trackCylinkConversion();
    expect(ok).toBe(true);
    const body = JSON.parse(String((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.tracking_id).toBe('FALLBACK123');
  });

  it('supports apiUrl override and clearAfterConversion', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/?cyt=CLEARME'),
      writable: true,
    });

    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }) as unknown as Response,
      );

    await importFresh();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const onSuccess = vi.fn();
    const ok = window.trackCylinkConversion({
      apiUrl: 'https://api.override/conversions',
      clearAfterConversion: true,
      onSuccess,
    });
    expect(ok).toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.override/conversions');

    // Wait until the async chain calls onSuccess and clears storage
    await vi.waitUntil(() => onSuccess.mock.calls.length > 0);
    expect(localStorage.getItem('cylinkTrackingId')).toBeNull();
  });

  it('invokes onError on failed fetch', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/?cyt=ERRID'),
      writable: true,
    });

    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('fail', { status: 500 }) as unknown as Response,
    );

    await importFresh();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const onError = vi.fn();
    const ok = window.trackCylinkConversion({ onError });
    expect(ok).toBe(true);

    // Allow promise rejection path to execute
    await vi.waitUntil(() => onError.mock.calls.length > 0);
  });
});
