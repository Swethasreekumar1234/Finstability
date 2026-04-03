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
    if (!res.ok) throw new Error(`API ${res.status}`);
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
    const res = await post<{ message: string; transaction: TransactionItem }>('/transactions/add-transaction', payload);
    return res.transaction;
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
