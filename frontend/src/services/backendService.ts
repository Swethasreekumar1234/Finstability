const BACKEND_URL = 'http://localhost:8000';

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
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.status === 'ok' && data.index_loaded === true;
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
    const res = await fetch(`${BACKEND_URL}/recommend-schemes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });

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
