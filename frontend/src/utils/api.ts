/**
 * Robust API Client with safe response handling and graceful HTML/non-JSON error recovery.
 * Prevents "Unexpected token '<', '<...' is not valid JSON" crashes.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Extracts a concise, human-readable error from raw HTML response text.
 */
function extractErrorMessageFromHtml(html: string, status: number): string {
  try {
    // Check for title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const cleanTitle = titleMatch[1].trim();
      if (!cleanTitle.toLowerCase().includes('vite') && !cleanTitle.toLowerCase().includes('react')) {
        return `${cleanTitle} (HTTP ${status})`;
      }
    }

    // Check for h1 tag
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      return `${h1Match[1].trim()} (HTTP ${status})`;
    }

    // Check for pre or code block
    const preMatch = html.match(/<pre[^>]*>([^<]+)<\/pre>/i);
    if (preMatch && preMatch[1]) {
      return `${preMatch[1].trim().slice(0, 100)} (HTTP ${status})`;
    }
  } catch {
    // Ignore extraction errors
  }

  if (status === 404) {
    return `Endpoint route not found on server (HTTP 404).`;
  }
  if (status === 500) {
    return `Internal server error occurred (HTTP 500).`;
  }
  if (status === 502 || status === 503 || status === 504) {
    return `Server gateway or backend service temporarily unavailable (HTTP ${status}).`;
  }
  return `Server returned an HTML document instead of JSON (HTTP ${status}). Please check API connectivity.`;
}

/**
 * Format any arbitrary error or object safely into a string to prevent React rendering errors
 */
export function formatErrorMessage(raw: any, fallback = 'An unexpected error occurred'): string {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'string') {
    if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
      try {
        const parsed = JSON.parse(raw);
        return formatErrorMessage(parsed, fallback);
      } catch {}
    }
    return raw;
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  if (typeof raw === 'object') {
    if (typeof raw.message === 'string') return raw.message;
    if (typeof raw.error === 'string') return raw.error;
    if (typeof raw.error === 'object' && raw.error) {
      return formatErrorMessage(raw.error, fallback);
    }
    if (typeof raw.detail === 'string') return raw.detail;
    if (typeof raw.msg === 'string') return raw.msg;
    try {
      return JSON.stringify(raw);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Safe fetch that reads raw text first, validates JSON format,
 * and handles HTML error responses gracefully.
 */
export async function safeFetch<T = any>(
  input: string | RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('9tepay_session_token') || sessionStorage.getItem('9tepay_session_token');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> || {}),
    };

    // If sending a body and not already specified, default to JSON
    if (init?.body && typeof init.body === 'string' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    const status = response.status;
    const rawText = await response.text();
    const trimmedText = rawText.trim();

    // Check for empty body
    if (!trimmedText) {
      if (response.ok) {
        return { ok: true, status, data: {} as T, error: null };
      }
      return {
        ok: false,
        status,
        data: null,
        error: `Server responded with status ${status} and an empty payload.`,
      };
    }

    // Check if response is raw HTML or XML
    const isHtml =
      trimmedText.startsWith('<!DOCTYPE') ||
      trimmedText.startsWith('<html') ||
      trimmedText.startsWith('<?xml') ||
      trimmedText.startsWith('<div') ||
      trimmedText.startsWith('<span') ||
      trimmedText.startsWith('<pre');

    if (isHtml) {
      const errorMsg = extractErrorMessageFromHtml(trimmedText, status);
      return {
        ok: false,
        status,
        data: null,
        error: errorMsg,
      };
    }

    // Attempt to parse JSON safely
    let parsed: any;
    try {
      parsed = JSON.parse(trimmedText);
    } catch {
      return {
        ok: false,
        status,
        data: null,
        error: `Invalid response format from server (expected JSON, received non-JSON text).`,
      };
    }

    // Check HTTP status code
    if (!response.ok) {
      const errorCandidate =
        parsed?.error ??
        parsed?.message ??
        parsed?.detail ??
        parsed?.err ??
        parsed;
      return {
        ok: false,
        status,
        data: parsed,
        error: formatErrorMessage(errorCandidate, `Server request failed with status ${status}.`),
      };
    }

    // Also check if body explicitly contains { success: false } or { error: "..." }
    if (parsed && typeof parsed === 'object' && (parsed.success === false || (parsed.error && parsed.error !== null))) {
      return {
        ok: false,
        status,
        data: parsed,
        error: formatErrorMessage(parsed.error || parsed.message, 'Request was not successful.'),
      };
    }

    return {
      ok: true,
      status,
      data: parsed as T,
      error: null,
    };
  } catch (err: any) {
    const rawMessage = err?.message || '';
    const message =
      rawMessage.toLowerCase().includes('failed to fetch') ||
      rawMessage.toLowerCase().includes('networkerror') ||
      rawMessage.toLowerCase().includes('network request failed')
        ? 'Unable to reach the 9tepay server. Start the app server and try again.'
        : rawMessage || 'Network connection error. Please check your internet connection.';
    return {
      ok: false,
      status: 0,
      data: null,
      error: formatErrorMessage(message, 'Network connection error. Please check your internet connection.'),
    };
  }
}

/**
 * Convenience fetcher that returns parsed data directly or throws a formatted Error.
 * Perfect for use in async event handlers and form submitters.
 */
export async function fetchJson<T = any>(
  input: string | RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const result = await safeFetch<T>(input, init);
  if (!result.ok) {
    throw new Error(result.error || `Request failed with status ${result.status}`);
  }
  return result.data as T;
}

/**
 * Standard API helpers
 */
export const api = {
  get: <T = any>(url: string, init?: RequestInit) =>
    fetchJson<T>(url, { method: 'GET', ...init }),

  post: <T = any>(url: string, body?: any, init?: RequestInit) =>
    fetchJson<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    }),

  put: <T = any>(url: string, body?: any, init?: RequestInit) =>
    fetchJson<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    }),

  delete: <T = any>(url: string, init?: RequestInit) =>
    fetchJson<T>(url, { method: 'DELETE', ...init }),
};
