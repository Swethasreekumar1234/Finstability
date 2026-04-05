/**
 * API Service – communicates with the Finstability FastAPI backend.
 * Falls back gracefully when the backend is unavailable.
 */

import { getBackendBaseUrl } from '../config/backend';

const API_BASE = getBackendBaseUrl();

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
  age?: number | null;
  age_confirmed?: boolean;
  gender?: string | null;
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
  caste_category?: string;
  minority_status?: boolean;
  disability_status?: boolean;
  disability_percentage?: number;
  marital_status?: string;
  age_band?: string;
  city?: string;
  district?: string;
  urban_rural?: string;
  domicile_years?: number;
  aspirational_district?: boolean;
  special_region_flag?: boolean;
  household_size?: number;
  dependent_children?: number;
  senior_citizens_in_household?: number;
  single_woman_led_household?: boolean;
  occupation_subtype?: string;
  sector?: string;
  employment_proof_available?: boolean;
  education_level?: string;
  student_status?: string;
  institution_type?: string;
  course_stream?: string;
  housing_status?: string;
  income_range?: string;
  income_regular?: boolean;
  earning_members?: number;
  has_bank_account?: boolean;
  jan_dhan_account?: boolean;
  has_aadhaar?: boolean;
  has_pan?: boolean;
  landholding_acres?: number;
  irrigation_status?: string;
  housing_ownership_type?: string;
  pmay_eligible?: boolean;
  has_life_insurance?: boolean;
  has_health_insurance?: boolean;
  enrolled_pmjjby?: boolean;
  enrolled_pmsby?: boolean;
  enrolled_apy?: boolean;
  enrolled_esic?: boolean;
  enrolled_epfo?: boolean;
  application_history_status?: string;
  benefit_cap_reached?: boolean;
  has_ration_card?: boolean;
  has_caste_certificate?: boolean;
  has_disability_certificate?: boolean;
  has_income_certificate?: boolean;
  has_domicile_certificate?: boolean;
  has_bank_passbook?: boolean;
  has_ppf?: boolean;
  has_fd?: boolean;
  has_mutual_funds?: boolean;
  has_gold_investments?: boolean;
  profile_completeness?: number;
  profile_layer?: string;
  profile_tags?: string[];
  missing_fields?: string[];
  unlocked_capabilities?: string[];
  next_prompt?: string | null;
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
  nav_highlights?: FundNavSnapshot[];
}

export interface InvestmentRecommendationsResponse {
  portfolios: InvestmentPortfolio[];
  recommended_monthly_investment: number;
  primary_recommendation: string;
  reasoning: string;
  as_of?: string;
}

export interface FundNavSnapshot {
  scheme_code: string;
  scheme_name: string;
  isin: string;
  nav: number;
  nav_date: string;
  fetched_at: string;
}

export interface BenefitEstimateResponse {
  total_estimated_benefits: number;
  breakdown: Array<{ scheme_name: string; annual_amount: number; category: string }>;
}

export interface TransactionItem {
  user_id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  source: 'manual' | 'bank_upload';
  created_at: string;
}

export interface AddTransactionPayload {
  user_id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  merchant: string;
  category?: string;
}

export interface MonthlySummary {
  total_income: number;
  total_expenses: number;
  savings: number;
  expense_ratio: number;
  category_breakdown: Record<string, number>;
  alerts: string[];
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
    if (!res.ok) {
      let detail = '';
      try {
        const payload = await res.json();
        detail = payload?.detail ? String(payload.detail) : '';
      } catch {
        // Ignore parse errors and fall back to status-only message.
      }
      throw new Error(detail ? `API ${res.status}: ${detail}` : `API ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
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

  async getProfileByEmail(email: string): Promise<BackendProfile | null> {
    try {
      const query = encodeURIComponent(email.trim().toLowerCase());
      return await get<BackendProfile>(`/profile/by-email?email=${query}`);
    } catch {
      return null;
    }
  },

  async getProfileByUserId(userId: string): Promise<BackendProfile | null> {
    try {
      const id = encodeURIComponent(userId.trim());
      if (!id) return null;
      return await get<BackendProfile>(`/profile/${id}`);
    } catch {
      return null;
    }
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

  async addTransaction(payload: AddTransactionPayload): Promise<TransactionItem> {
    try {
      const res = await post<{ message: string; transaction: TransactionItem }>('/transactions/add-transaction', payload);
      return res.transaction;
    } catch (error) {
      // Uvicorn reload can transiently return 500 even when insert succeeded.
      const month = payload.date.slice(0, 7);
      try {
        const recent = await apiService.listTransactions(payload.user_id, month);
        const saved = recent.find((item) => (
          item.date === payload.date
          && item.type === payload.type
          && Math.abs(item.amount - payload.amount) < 0.01
          && item.merchant.trim().toLowerCase() === payload.merchant.trim().toLowerCase()
        ));
        if (saved) {
          return saved;
        }
      } catch {
        // Ignore fallback lookup failure and rethrow the original error.
      }
      throw error;
    }
  },

  async listTransactions(userId: string, month?: string, category?: string): Promise<TransactionItem[]> {
    const params = new URLSearchParams({ user_id: userId });
    if (month) params.append('month', month);
    if (category && category !== 'all') params.append('category', category);
    const res = await get<{ transactions: TransactionItem[] }>(`/transactions/list?${params.toString()}`);
    return res.transactions;
  },

  async uploadBankStatement(userId: string, uri: string, filename: string, mimeType: string): Promise<{ inserted: number; duplicates: number; total_rows: number }> {
    const form = new FormData();
    form.append('user_id', userId);
    form.append('file', {
      uri,
      name: filename,
      type: mimeType || 'application/octet-stream',
    } as any);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE}/transactions/upload-bank-statement`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`API ${res.status}`);
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  },

  async getMonthlySummary(userId: string, month: string): Promise<MonthlySummary> {
    const params = new URLSearchParams({ user_id: userId, month });
    return get<MonthlySummary>(`/transactions/monthly-summary?${params.toString()}`);
  },

  async setBudget(user_id: string, category: string, monthly_limit: number): Promise<void> {
    await post('/transactions/set-budget', { user_id, category, monthly_limit });
  },

  async getHealthMetrics(userId: string, month: string): Promise<{ total_savings: number; expense_ratio: number; total_income: number; total_expenses: number }> {
    const params = new URLSearchParams({ user_id: userId, month });
    return get(`/transactions/health-metrics?${params.toString()}`);
  },
};
