from __future__ import annotations
from typing import Optional, List, Literal, Dict
from datetime import datetime
from pydantic import BaseModel


class UserProfile(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    user_type: Optional[str] = None
    risk_tolerance: Optional[str] = None
    firebase_uid: Optional[str] = None
    age: Optional[int] = None
    age_confirmed: Optional[bool] = False
    age_band: Optional[str] = None  # 18-24 / 25-34 / 35-44 / 45-54 / 55+
    gender: Optional[str] = None          # male / female / other
    marital_status: Optional[str] = None
    minority_status: Optional[bool] = None
    disability_status: Optional[bool] = None
    disability_percentage: Optional[float] = None
    state: str = "Delhi"
    city: Optional[str] = None
    district: Optional[str] = None
    urban_rural: Optional[str] = None
    domicile_years: Optional[int] = None
    aspirational_district: Optional[bool] = None
    special_region_flag: Optional[bool] = None
    occupation: str = "salaried"
    occupation_subtype: Optional[str] = None
    sector: Optional[str] = None
    employment_type: str = "salaried"  # salaried / self_employed / farmer / student / unemployed / retired
    employment_proof_available: Optional[bool] = None
    education_level: Optional[str] = None
    student_status: Optional[str] = None
    institution_type: Optional[str] = None
    course_stream: Optional[str] = None
    household_size: int = 1
    dependent_children: Optional[int] = None
    senior_citizens_in_household: Optional[int] = None
    single_woman_led_household: Optional[bool] = None
    housing_status: Optional[str] = None  # owned / rented / living_with_family / other
    housing_ownership_type: Optional[str] = None
    pmay_eligible: Optional[bool] = None
    monthly_income: float = 0.0
    income_range: Optional[str] = None  # e.g. 0-25k, 25k-50k, 50k-1L, 1L+
    income_regular: Optional[bool] = None
    earning_members: Optional[int] = None
    has_bank_account: Optional[bool] = None
    jan_dhan_account: Optional[bool] = None
    has_aadhaar: Optional[bool] = None
    has_pan: Optional[bool] = None
    monthly_expenses: float = 0.0
    total_savings: float = 0.0
    total_debts: float = 0.0
    existing_loans: Optional[float] = None
    family_size: int = 1
    landholding_acres: Optional[float] = None
    irrigation_status: Optional[str] = None
    has_life_insurance: Optional[bool] = None
    has_health_insurance: Optional[bool] = None
    enrolled_pmjjby: Optional[bool] = None
    enrolled_pmsby: Optional[bool] = None
    enrolled_apy: Optional[bool] = None
    enrolled_esic: Optional[bool] = None
    enrolled_epfo: Optional[bool] = None
    application_history_status: Optional[str] = None
    benefit_cap_reached: Optional[bool] = None
    has_ration_card: Optional[bool] = None
    has_caste_certificate: Optional[bool] = None
    has_disability_certificate: Optional[bool] = None
    has_income_certificate: Optional[bool] = None
    has_domicile_certificate: Optional[bool] = None
    has_bank_passbook: Optional[bool] = None
    has_ppf: Optional[bool] = None
    has_fd: Optional[bool] = None
    has_mutual_funds: Optional[bool] = None
    has_gold_investments: Optional[bool] = None
    financial_goals: Optional[List[str]] = None
    investment_experience: Optional[int] = None
    updated_at_client: Optional[str] = None
    has_land: bool = False
    caste_category: Optional[str] = None  # general / obc / sc / st


class ProfileSummary(BaseModel):
    profile_completeness: int
    profile_layer: str
    profile_tags: List[str]
    missing_fields: List[str]
    unlocked_capabilities: List[str]
    next_prompt: Optional[str] = None


class GovernmentScheme(BaseModel):
    scheme_id: str
    scheme_name: str
    ministry: str
    description: str
    benefits: str
    eligibility: str
    income_limit: Optional[float] = None   # monthly income limit in INR
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    gender: Optional[str] = None           # male / female / all
    occupation: Optional[List[str]] = None
    states: Optional[List[str]] = None     # None = central / all states
    category: str                          # subsidy / pension / insurance / grant / loan_support / scholarship
    application_link: str
    estimated_annual_benefit: Optional[float] = None
    source_url: Optional[str] = None


class SchemeRecommendation(BaseModel):
    scheme: GovernmentScheme
    eligibility_match: float   # 0.0–1.0
    reason: str
    estimated_annual_benefit: float


class EligibleSchemesResponse(BaseModel):
    schemes: List[SchemeRecommendation]
    total_estimated_benefits: float
    missing_benefit_count: int


class BenefitEstimate(BaseModel):
    scheme_name: str
    annual_amount: float
    category: str


class BenefitEstimateResponse(BaseModel):
    total_estimated_benefits: float
    breakdown: List[BenefitEstimate]


class InvestmentPortfolio(BaseModel):
    name: str
    risk_level: str   # Low / Moderate / High
    risk_color: str
    description: str
    allocation: dict  # {"Equity": 40, "Debt": 40, ...}
    expected_return_min: float
    expected_return_max: float
    platforms: List[str]
    platform_urls: List[str]
    explanation: str
    min_monthly_sip: float
    nav_highlights: Optional[List["FundNavSnapshot"]] = None


class FundNavSnapshot(BaseModel):
    scheme_code: str
    scheme_name: str
    isin: str
    nav: float
    nav_date: str
    fetched_at: datetime


class InvestmentRecommendationsResponse(BaseModel):
    portfolios: List[InvestmentPortfolio]
    recommended_monthly_investment: float
    primary_recommendation: str
    reasoning: str
    as_of: Optional[datetime] = None


class FundNavDocument(BaseModel):
    scheme_code: str
    scheme_name: str
    isin: str
    nav: float
    nav_date: str
    fetched_at: datetime


class FundNavHistoryResponse(BaseModel):
    scheme_code: str
    count: int
    items: List[FundNavDocument]


class TransactionIn(BaseModel):
    user_id: str
    date: str
    amount: float
    type: Literal["income", "expense"]
    category: Optional[str] = None
    merchant: str
    source: Literal["manual", "bank_upload"] = "manual"


class BudgetIn(BaseModel):
    user_id: str
    category: str
    monthly_limit: float


class TransactionOut(BaseModel):
    user_id: str
    date: str
    amount: float
    type: Literal["income", "expense"]
    category: str
    merchant: str
    source: Literal["manual", "bank_upload"]
    created_at: str


class MonthlySummaryResponse(BaseModel):
    total_income: float
    total_expenses: float
    savings: float
    expense_ratio: float
    category_breakdown: Dict[str, float]
    alerts: List[str]
