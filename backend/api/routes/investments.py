from __future__ import annotations
from fastapi import APIRouter
from database.models import UserProfile, InvestmentPortfolio, InvestmentRecommendationsResponse

router = APIRouter()

_PORTFOLIOS = [
    InvestmentPortfolio(
        name="Conservative",
        risk_level="Low",
        risk_color="#10B981",
        description="Capital preservation with steady income. Ideal for risk-averse investors or those near retirement.",
        allocation={"FD / RD (Debt)": 55, "Gold (SGB/ETF)": 15, "Large-cap Index": 20, "Liquid Funds": 10},
        expected_return_min=6.5,
        expected_return_max=9.0,
        platforms=["HDFC Bank FD", "SBI Gold Bond", "Kuvera"],
        platform_urls=[
            "https://www.hdfcbank.com/",
            "https://rbi.org.in/",
            "https://kuvera.in/",
        ],
        explanation="FDs + gold + large-cap index funds balance safety with moderate real returns. Good for ages 50+ or high debt situations.",
        min_monthly_sip=500.0,
    ),
    InvestmentPortfolio(
        name="Balanced",
        risk_level="Moderate",
        risk_color="#F59E0B",
        description="Equal focus on growth and stability. Best for 5–10 year goals.",
        allocation={"Equity Mutual Funds": 40, "Debt Funds": 30, "Gold ETF": 15, "ELSS (80C)": 15},
        expected_return_min=10.0,
        expected_return_max=14.0,
        platforms=["Zerodha Coin", "Groww", "Paytm Money"],
        platform_urls=[
            "https://coin.zerodha.com/",
            "https://groww.in/",
            "https://www.paytmmoney.com/",
        ],
        explanation="Blended allocation gives market-linked growth while debt and gold cushion volatility. Good for most working adults.",
        min_monthly_sip=1000.0,
    ),
    InvestmentPortfolio(
        name="Growth",
        risk_level="High",
        risk_color="#EF4444",
        description="Maximum long-term wealth creation. Best for young investors with 10+ year horizon.",
        allocation={"Mid/Small-cap Equity": 40, "Large-cap Index": 25, "International Funds": 15, "ELSS": 10, "REITs": 10},
        expected_return_min=14.0,
        expected_return_max=20.0,
        platforms=["Zerodha Kite", "Groww", "INDmoney"],
        platform_urls=[
            "https://kite.zerodha.com/",
            "https://groww.in/",
            "https://www.indmoney.com/",
        ],
        explanation="High equity in diversified funds can generate superior compounding over 10+ years. Best for ages 18–35 with low debt.",
        min_monthly_sip=2000.0,
    ),
]


def _primary_index(profile: UserProfile) -> int:
    if profile.age >= 55 or profile.total_debts > profile.monthly_income * 6:
        return 0  # Conservative
    if profile.age <= 35 and profile.total_savings >= profile.monthly_income * 3:
        return 2  # Growth
    return 1  # Balanced


@router.post(
    "/recommend",
    response_model=InvestmentRecommendationsResponse,
    summary="Investment portfolio recommendations based on user profile",
)
async def recommend_investments(profile: UserProfile):
    idx = _primary_index(profile)
    monthly = max(500.0, profile.monthly_income * 0.15)
    reasoning = (
        f"Based on your age ({profile.age}), income (₹{profile.monthly_income:,.0f}/month), "
        f"savings (₹{profile.total_savings:,.0f}), and debt (₹{profile.total_debts:,.0f}), "
        f"the {_PORTFOLIOS[idx].name} portfolio is your best fit. "
        f"Investing ₹{monthly:,.0f}/month (15% of income) as SIP is recommended."
    )
    return InvestmentRecommendationsResponse(
        portfolios=_PORTFOLIOS,
        recommended_monthly_investment=monthly,
        primary_recommendation=_PORTFOLIOS[idx].name,
        reasoning=reasoning,
    )
