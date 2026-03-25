/**
 * API Service – communicates with the Finstability FastAPI backend.
 * Falls back gracefully when the backend is unavailable.
 */

const API_BASE = 'http://localhost:8000';

// ─── Request/Response types ────────────────────────────────────────────────

export interface BackendProfile {
  user_id?: string;
  name?: string;
  full_name?: string;
  display_name?: string;
  email?: string;
  phone_number?: string;
  user_type?: string;
  risk_tolerance?: string;
  firebase_uid?: string;
  age: number;
  gender: string;
  state: string;
  occupation: string;
  employment_type: string;
  monthly_income: number;
  monthly_expenses: number;
  total_savings: number;
  total_debts: number;
  existing_loans?: number;
  financial_goals?: string[];
  investment_experience?: number;
  updated_at_client?: string;
  family_size: number;
  has_land?: boolean;
}

export interface BackendScheme {
  scheme_id: string;
  scheme_name: string;
  ministry: string;
  description: string;
  benefits: string;
  eligibility: string;
  income_limit?: number;
  min_age?: number;
  max_age?: number;
  gender?: string;
  occupation?: string[];
  states?: string[];
  category: string;
  application_link: string;
  estimated_annual_benefit?: number;
  source_url?: string;
}

export interface SchemeRecommendation {
  scheme: BackendScheme;
  eligibility_match: number;
  reason: string;
  estimated_annual_benefit: number;
}

export interface EligibleSchemesResponse {
  schemes: SchemeRecommendation[];
  total_estimated_benefits: number;
  missing_benefit_count: number;
}

export interface InvestmentPortfolio {
  name: string;
  risk_level: string;
  risk_color: string;
  description: string;
  allocation: Record<string, number>;
  expected_return_min: number;
  expected_return_max: number;
  platforms: string[];
  platform_urls: string[];
  explanation: string;
  min_monthly_sip: number;
}

export interface InvestmentRecommendationsResponse {
  portfolios: InvestmentPortfolio[];
  recommended_monthly_investment: number;
  primary_recommendation: string;
  reasoning: string;
}

export interface BenefitEstimateResponse {
  total_estimated_benefits: number;
  breakdown: Array<{ scheme_name: string; annual_amount: number; category: string }>;
}

// ─── Internal fetch helper ─────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10 s timeout
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export const apiService = {
  async saveProfile(profile: BackendProfile): Promise<void> {
    await post('/profile/', profile);
  },

  async recommendSchemes(profile: BackendProfile): Promise<EligibleSchemesResponse> {
    return post<EligibleSchemesResponse>('/schemes/recommend', profile);
  },

  async estimateBenefits(profile: BackendProfile): Promise<BenefitEstimateResponse> {
    return post<BenefitEstimateResponse>('/schemes/estimate-benefits', profile);
  },

  async recommendInvestments(profile: BackendProfile): Promise<InvestmentRecommendationsResponse> {
    return post<InvestmentRecommendationsResponse>('/investments/recommend', profile);
  },

  /** Returns true if the backend server is reachable. */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  },
};
