from __future__ import annotations
from typing import Optional, List, Literal, Dict
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
    age: int = 25
    gender: str = "male"          # male / female / other
    state: str = "Delhi"
    occupation: str = "salaried"
    employment_type: str = "salaried"  # salaried / self_employed / farmer / student / unemployed / retired
    monthly_income: float = 0.0
    monthly_expenses: float = 0.0
    total_savings: float = 0.0
    total_debts: float = 0.0
    existing_loans: Optional[float] = None
    family_size: int = 1
    financial_goals: Optional[List[str]] = None
    investment_experience: Optional[int] = None
    updated_at_client: Optional[str] = None
    has_land: bool = False
    caste_category: Optional[str] = None  # general / obc / sc / st


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


class InvestmentRecommendationsResponse(BaseModel):
    portfolios: List[InvestmentPortfolio]
    recommended_monthly_investment: float
    primary_recommendation: str
    reasoning: str


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
