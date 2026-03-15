from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel


class UserProfile(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None
    age: int = 25
    gender: str = "male"          # male / female / other
    state: str = "Delhi"
    occupation: str = "salaried"
    employment_type: str = "salaried"  # salaried / self_employed / farmer / student / unemployed / retired
    monthly_income: float = 0.0
    monthly_expenses: float = 0.0
    total_savings: float = 0.0
    total_debts: float = 0.0
    family_size: int = 1
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
