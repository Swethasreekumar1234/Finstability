import { getBackendBaseUrls } from '../config/backend';

async function fetchFromBackend(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let lastError: unknown = null;

  for (const baseUrl of getBackendBaseUrls()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Backend unavailable');
}

export interface BackendScheme {
  scheme_name: string;
  benefits: string;
  why_eligible: string;
  application_link: string;
}

export interface UserProfileForBackend {
  age: number;
  gender: string;
  income: number;
  occupation: string;
  state: string;
}

/**
 * Check if the backend is running
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchFromBackend('/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get AI-powered scheme recommendations from the backend.
 * Falls back to empty array if backend is unavailable.
 */
export async function getAISchemeRecommendations(
  profile: UserProfileForBackend
): Promise<BackendScheme[]> {
  try {
    const res = await fetchFromBackend('/recommend-schemes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }, 10000);

    if (!res.ok) {
      console.warn('Backend returned error:', res.status);
      return [];
    }

    const data = await res.json();
    return data.recommended_schemes ?? [];
  } catch (err) {
    console.warn('Backend unavailable, using fallback:', err);
    return [];
  }
}
