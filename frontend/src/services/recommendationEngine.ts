/**
 * Financial Recommendation Engine
 * --------------------------------
 * Core logic module for generating personalized financial suggestions
 * based on user profile, income, and goals.
 */

import { UserType, RiskTolerance, FinancialGoal, FinancialProfile } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface GovernmentScheme {
  scheme_name: string;
  ministry: string;
  description: string;
  eligibility: string;
  target_beneficiaries: string;
  benefits: string;
  application_process: string;
  application_link: string;
  state: string;
  category: string;
  source_url?: string;
}

export interface LoanRecommendation {
  type: string;
  name: string;
  description: string;
  interestRange: string;
  maxAmount: string;
  eligibility: string[];
  features: string[];
  suitableFor: UserType[];
  riskLevel: RiskTolerance;
}

export interface InvestmentRecommendation {
  type: string;
  name: string;
  description: string;
  expectedReturns: string;
  riskLevel: RiskTolerance;
  minInvestment: string;
  lockInPeriod: string;
  taxBenefits: boolean;
  suitableFor: UserType[];
  goals: FinancialGoal[];
}

export interface SavingsRecommendation {
  type: string;
  name: string;
  description: string;
  interestRate: string;
  features: string[];
  suitableFor: UserType[];
}

export interface FinancialRecommendations {
  schemes: GovernmentScheme[];
  loans: LoanRecommendation[];
  investments: InvestmentRecommendation[];
  savings: SavingsRecommendation[];
  tips: string[];
}

// =============================================================================
// GOVERNMENT SCHEMES DATABASE (from scraper)
// =============================================================================

const GOVERNMENT_SCHEMES: GovernmentScheme[] = [
  {
    scheme_name: "Pradhan Mantri Jan Dhan Yojana (PMJDY)",
    ministry: "Ministry of Finance",
    description: "National Mission for Financial Inclusion providing zero balance bank accounts with accident insurance.",
    eligibility: "Any Indian citizen above 10 years without a bank account",
    target_beneficiaries: "Unbanked population, rural and urban poor",
    benefits: "Zero balance account, RuPay debit card, Rs 2 lakh accident cover, overdraft up to Rs 10,000",
    application_process: "Visit nearest bank branch with Aadhaar",
    application_link: "https://pmjdy.gov.in/",
    state: "Central",
    category: "finance_subsidy"
  },
  {
    scheme_name: "PM-KISAN",
    ministry: "Ministry of Agriculture",
    description: "Income support of Rs 6000/year for farmer families in three installments.",
    eligibility: "Small and marginal farmer families with cultivable landholding",
    target_beneficiaries: "Farmers",
    benefits: "Rs 6000 per year direct bank transfer",
    application_process: "Register through PM-KISAN portal or CSC",
    application_link: "https://pmkisan.gov.in/",
    state: "Central",
    category: "agriculture"
  },
  {
    scheme_name: "Pradhan Mantri Mudra Yojana (PMMY)",
    ministry: "Ministry of Finance",
    description: "Collateral-free loans up to Rs 10 lakh for micro enterprises.",
    eligibility: "Any Indian citizen with a business plan",
    target_beneficiaries: "Small business owners, entrepreneurs",
    benefits: "Shishu: up to 50K, Kishore: 50K-5L, Tarun: 5L-10L",
    application_process: "Apply at any bank or NBFC with business plan",
    application_link: "https://www.mudra.org.in/",
    state: "Central",
    category: "msme_business"
  },
  {
    scheme_name: "Ayushman Bharat PM-JAY",
    ministry: "Ministry of Health",
    description: "Rs 5 lakh health insurance coverage per family for hospitalization.",
    eligibility: "Families in SECC database",
    target_beneficiaries: "Poor and vulnerable families",
    benefits: "Rs 5 lakh coverage, cashless treatment at empaneled hospitals",
    application_process: "Check eligibility on mera.pmjay.gov.in",
    application_link: "https://pmjay.gov.in/",
    state: "Central",
    category: "healthcare"
  },
  {
    scheme_name: "Pradhan Mantri Awas Yojana (PMAY)",
    ministry: "Ministry of Housing",
    description: "Housing subsidy for EWS/LIG/MIG categories.",
    eligibility: "Households without pucca house, income criteria apply",
    target_beneficiaries: "Houseless families",
    benefits: "Interest subsidy Rs 1.5L to Rs 2.67L on home loans",
    application_process: "Apply through PMAY portal",
    application_link: "https://pmaymis.gov.in/",
    state: "Central",
    category: "housing"
  },
  {
    scheme_name: "Sukanya Samriddhi Yojana",
    ministry: "Ministry of Finance",
    description: "High-interest savings scheme for girl child education/marriage.",
    eligibility: "Girl child below 10 years",
    target_beneficiaries: "Parents of girl children",
    benefits: "8.2% interest, tax-free, maturity at 21 years",
    application_process: "Open account at post office or bank",
    application_link: "https://www.india.gov.in/sukanya-samriddhi-yojna",
    state: "Central",
    category: "women_welfare"
  },
  {
    scheme_name: "Atal Pension Yojana",
    ministry: "PFRDA",
    description: "Guaranteed pension Rs 1000-5000/month after age 60.",
    eligibility: "Age 18-40 years with bank account",
    target_beneficiaries: "Unorganized sector workers",
    benefits: "Fixed monthly pension, government co-contribution",
    application_process: "Enroll through bank",
    application_link: "https://www.npscra.nsdl.co.in/",
    state: "Central",
    category: "senior_citizen"
  },
  {
    scheme_name: "Stand Up India",
    ministry: "Ministry of Finance",
    description: "Loans Rs 10 lakh to Rs 1 crore for SC/ST and women entrepreneurs.",
    eligibility: "SC/ST or women, first-time entrepreneurs",
    target_beneficiaries: "SC/ST and women entrepreneurs",
    benefits: "Bank loans for greenfield enterprises",
    application_process: "Apply on standupmitra.in",
    application_link: "https://www.standupmitra.in/",
    state: "Central",
    category: "msme_business"
  },
  {
    scheme_name: "PM SVANidhi",
    ministry: "Ministry of Housing",
    description: "Micro-credit for street vendors up to Rs 50,000.",
    eligibility: "Street vendors with certificate",
    target_beneficiaries: "Street vendors",
    benefits: "Working capital loan, digital payment incentive",
    application_process: "Apply on pmsvanidhi.mohua.gov.in",
    application_link: "https://pmsvanidhi.mohua.gov.in/",
    state: "Central",
    category: "msme_business"
  },
  {
    scheme_name: "National Scholarship Portal",
    ministry: "Ministry of Education",
    description: "Various scholarships for students based on merit and means.",
    eligibility: "Students from economically weaker sections",
    target_beneficiaries: "Students at all levels",
    benefits: "Financial assistance for education",
    application_process: "Apply on scholarships.gov.in",
    application_link: "https://scholarships.gov.in/",
    state: "Central",
    category: "education"
  },
  {
    scheme_name: "PM Ujjwala Yojana",
    ministry: "Ministry of Petroleum",
    description: "Free LPG connections for BPL women.",
    eligibility: "Adult woman from BPL household",
    target_beneficiaries: "BPL families",
    benefits: "Free LPG connection, stove, first refill",
    application_process: "Apply at LPG distributor",
    application_link: "https://www.pmujjwalayojana.com/",
    state: "Central",
    category: "finance_subsidy"
  },
  {
    scheme_name: "PMEGP",
    ministry: "Ministry of MSME",
    description: "Subsidy for micro enterprise establishment.",
    eligibility: "Above 18 years, 8th pass for large projects",
    target_beneficiaries: "Unemployed youth, artisans",
    benefits: "15-35% margin money subsidy",
    application_process: "Apply through KVIC portal",
    application_link: "https://www.kviconline.gov.in/pmegp/",
    state: "Central",
    category: "employment"
  },
  {
    scheme_name: "Senior Citizen Savings Scheme",
    ministry: "Ministry of Finance",
    description: "High-interest savings for senior citizens.",
    eligibility: "Age 60+ (55+ for VRS)",
    target_beneficiaries: "Senior citizens",
    benefits: "8.2% interest, quarterly payout, tax benefits",
    application_process: "Open at post office or bank",
    application_link: "https://www.indiapost.gov.in/",
    state: "Central",
    category: "senior_citizen"
  },
  {
    scheme_name: "Pradhan Mantri Vaya Vandana Yojana",
    ministry: "LIC of India",
    description: "Pension scheme for senior citizens with guaranteed returns.",
    eligibility: "Age 60+ years",
    target_beneficiaries: "Senior citizens",
    benefits: "Guaranteed 7.4% annual return, pension payout",
    application_process: "Apply through LIC",
    application_link: "https://www.licindia.in/",
    state: "Central",
    category: "senior_citizen"
  },
  {
    scheme_name: "Startup India Seed Fund",
    ministry: "DPIIT",
    description: "Financial assistance for startups for proof of concept and prototype.",
    eligibility: "DPIIT recognized startups",
    target_beneficiaries: "Startups",
    benefits: "Up to Rs 50 lakh for validation, up to Rs 25 lakh grant",
    application_process: "Apply on seedfund.startupindia.gov.in",
    application_link: "https://seedfund.startupindia.gov.in/",
    state: "Central",
    category: "msme_business"
  },
];

// =============================================================================
// LOAN RECOMMENDATIONS DATABASE
// =============================================================================

const LOAN_TYPES: LoanRecommendation[] = [
  {
    type: "education",
    name: "Education Loan",
    description: "Finance higher education in India or abroad with flexible repayment after course completion.",
    interestRange: "8.5% - 11.5%",
    maxAmount: "Up to Rs 1.5 Crore",
    eligibility: [
      "Indian citizen",
      "Secured admission in recognized institution",
      "Co-applicant (parent/guardian) required"
    ],
    features: [
      "Moratorium during study + 6-12 months",
      "No collateral up to Rs 7.5 lakh",
      "Tax benefit under Section 80E",
      "Covers tuition, hostel, books, equipment"
    ],
    suitableFor: [UserType.STUDENT],
    riskLevel: RiskTolerance.LOW
  },
  {
    type: "personal",
    name: "Personal Loan",
    description: "Unsecured loan for any personal expenses including medical, wedding, or travel.",
    interestRange: "10.5% - 24%",
    maxAmount: "Up to Rs 40 Lakh",
    eligibility: [
      "Age 21-60 years",
      "Stable income source",
      "Good credit score (700+)"
    ],
    features: [
      "No collateral required",
      "Quick disbursement",
      "Flexible tenure 1-7 years",
      "Minimal documentation"
    ],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER],
    riskLevel: RiskTolerance.MODERATE
  },
  {
    type: "home",
    name: "Home Loan",
    description: "Long-term loan for purchasing, constructing, or renovating residential property.",
    interestRange: "8.4% - 10.5%",
    maxAmount: "Up to Rs 10 Crore",
    eligibility: [
      "Age 21-65 years at maturity",
      "Stable income",
      "Property as collateral"
    ],
    features: [
      "Tenure up to 30 years",
      "Tax benefits under 80C and 24(b)",
      "Balance transfer facility",
      "Top-up loan available"
    ],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER],
    riskLevel: RiskTolerance.LOW
  },
  {
    type: "business",
    name: "Business Loan",
    description: "Working capital and term loans for business expansion, equipment, and operations.",
    interestRange: "11% - 18%",
    maxAmount: "Up to Rs 5 Crore",
    eligibility: [
      "Business operational for 2+ years",
      "Positive cash flow",
      "GST registration preferred"
    ],
    features: [
      "Collateral & non-collateral options",
      "Flexible repayment",
      "Overdraft facility available",
      "Quick processing"
    ],
    suitableFor: [UserType.SMALL_BUSINESS_OWNER],
    riskLevel: RiskTolerance.MODERATE
  },
  {
    type: "gold",
    name: "Gold Loan",
    description: "Quick secured loan against gold jewelry with minimal documentation.",
    interestRange: "7% - 15%",
    maxAmount: "Up to 75% of gold value",
    eligibility: [
      "Own gold jewelry (18-24 karat)",
      "Valid KYC documents",
      "Age 18+ years"
    ],
    features: [
      "Same-day disbursement",
      "No income proof needed",
      "Flexible repayment",
      "Low interest rates"
    ],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER, UserType.RETIREE],
    riskLevel: RiskTolerance.LOW
  },
  {
    type: "vehicle",
    name: "Vehicle Loan",
    description: "Finance for purchasing new or used cars, two-wheelers, and commercial vehicles.",
    interestRange: "7.5% - 14%",
    maxAmount: "Up to 100% of vehicle cost",
    eligibility: [
      "Age 21-65 years",
      "Stable income",
      "Good credit history"
    ],
    features: [
      "Low down payment",
      "Tenure up to 7 years",
      "Pre-approved offers",
      "Insurance bundled"
    ],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER],
    riskLevel: RiskTolerance.LOW
  },
  {
    type: "lap",
    name: "Loan Against Property",
    description: "Secured loan using residential/commercial property as collateral.",
    interestRange: "8% - 12%",
    maxAmount: "Up to Rs 10 Crore",
    eligibility: [
      "Own property free of encumbrance",
      "Property valuation",
      "Income proof"
    ],
    features: [
      "Lower interest than personal loan",
      "Higher loan amount",
      "Long tenure up to 20 years",
      "Tax benefits available"
    ],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER, UserType.RETIREE],
    riskLevel: RiskTolerance.LOW
  },
];

// =============================================================================
// INVESTMENT RECOMMENDATIONS DATABASE
// =============================================================================

const INVESTMENT_OPTIONS: InvestmentRecommendation[] = [
  {
    type: "fd",
    name: "Fixed Deposits",
    description: "Safe investment with guaranteed returns from banks and NBFCs.",
    expectedReturns: "6% - 7.5% p.a.",
    riskLevel: RiskTolerance.LOW,
    minInvestment: "Rs 1,000",
    lockInPeriod: "7 days - 10 years",
    taxBenefits: true,
    suitableFor: [UserType.STUDENT, UserType.WORKING_PROFESSIONAL, UserType.RETIREE, UserType.SMALL_BUSINESS_OWNER],
    goals: [FinancialGoal.EMERGENCY_FUND, FinancialGoal.RETIREMENT]
  },
  {
    type: "ppf",
    name: "Public Provident Fund (PPF)",
    description: "Government-backed long-term savings with tax benefits under EEE category.",
    expectedReturns: "7.1% p.a.",
    riskLevel: RiskTolerance.LOW,
    minInvestment: "Rs 500/year",
    lockInPeriod: "15 years",
    taxBenefits: true,
    suitableFor: [UserType.STUDENT, UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER],
    goals: [FinancialGoal.RETIREMENT, FinancialGoal.EDUCATION]
  },
  {
    type: "nps",
    name: "National Pension System (NPS)",
    description: "Market-linked retirement savings with additional tax benefits under 80CCD.",
    expectedReturns: "8% - 12% p.a.",
    riskLevel: RiskTolerance.MODERATE,
    minInvestment: "Rs 500/month",
    lockInPeriod: "Till age 60",
    taxBenefits: true,
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER],
    goals: [FinancialGoal.RETIREMENT]
  },
  {
    type: "mutual_fund_equity",
    name: "Equity Mutual Funds",
    description: "Professionally managed diversified portfolio of stocks for wealth creation.",
    expectedReturns: "12% - 15% p.a.",
    riskLevel: RiskTolerance.HIGH,
    minInvestment: "Rs 500 (SIP)",
    lockInPeriod: "None (ELSS: 3 years)",
    taxBenefits: true,
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.STUDENT],
    goals: [FinancialGoal.INVESTMENT, FinancialGoal.RETIREMENT]
  },
  {
    type: "mutual_fund_debt",
    name: "Debt Mutual Funds",
    description: "Low-risk funds investing in bonds and money market instruments.",
    expectedReturns: "6% - 9% p.a.",
    riskLevel: RiskTolerance.LOW,
    minInvestment: "Rs 500 (SIP)",
    lockInPeriod: "None",
    taxBenefits: false,
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.RETIREE, UserType.SMALL_BUSINESS_OWNER],
    goals: [FinancialGoal.EMERGENCY_FUND]
  },
  {
    type: "ssy",
    name: "Sukanya Samriddhi Yojana",
    description: "High-interest savings for girl child education and marriage.",
    expectedReturns: "8.2% p.a.",
    riskLevel: RiskTolerance.LOW,
    minInvestment: "Rs 250/year",
    lockInPeriod: "21 years",
    taxBenefits: true,
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER],
    goals: [FinancialGoal.EDUCATION]
  },
  {
    type: "elss",
    name: "ELSS Tax Saver Funds",
    description: "Equity funds with shortest lock-in among 80C investments.",
    expectedReturns: "12% - 15% p.a.",
    riskLevel: RiskTolerance.HIGH,
    minInvestment: "Rs 500 (SIP)",
    lockInPeriod: "3 years",
    taxBenefits: true,
    suitableFor: [UserType.WORKING_PROFESSIONAL],
    goals: [FinancialGoal.INVESTMENT]
  },
  {
    type: "sgb",
    name: "Sovereign Gold Bonds",
    description: "Government securities in gold denomination with interest payment.",
    expectedReturns: "2.5% p.a. + gold price appreciation",
    riskLevel: RiskTolerance.MODERATE,
    minInvestment: "1 gram gold",
    lockInPeriod: "8 years (exit after 5)",
    taxBenefits: true,
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.RETIREE, UserType.SMALL_BUSINESS_OWNER],
    goals: [FinancialGoal.INVESTMENT, FinancialGoal.RETIREMENT]
  },
  {
    type: "rd",
    name: "Recurring Deposits",
    description: "Monthly savings with fixed returns, ideal for building savings habit.",
    expectedReturns: "5.5% - 7% p.a.",
    riskLevel: RiskTolerance.LOW,
    minInvestment: "Rs 100/month",
    lockInPeriod: "6 months - 10 years",
    taxBenefits: false,
    suitableFor: [UserType.STUDENT, UserType.WORKING_PROFESSIONAL],
    goals: [FinancialGoal.EMERGENCY_FUND, FinancialGoal.TRAVEL]
  },
  {
    type: "scss",
    name: "Senior Citizen Savings Scheme",
    description: "High-interest guaranteed returns for senior citizens.",
    expectedReturns: "8.2% p.a.",
    riskLevel: RiskTolerance.LOW,
    minInvestment: "Rs 1,000",
    lockInPeriod: "5 years",
    taxBenefits: true,
    suitableFor: [UserType.RETIREE],
    goals: [FinancialGoal.RETIREMENT]
  },
];

// =============================================================================
// SAVINGS RECOMMENDATIONS
// =============================================================================

const SAVINGS_OPTIONS: SavingsRecommendation[] = [
  {
    type: "high_yield_savings",
    name: "High-Yield Savings Account",
    description: "Digital bank accounts offering higher interest than traditional banks.",
    interestRate: "4% - 7% p.a.",
    features: ["Zero balance", "Instant transfers", "Higher interest", "Digital-first"],
    suitableFor: [UserType.STUDENT, UserType.WORKING_PROFESSIONAL]
  },
  {
    type: "sweep_account",
    name: "Sweep-in Fixed Deposit",
    description: "Combines savings liquidity with FD returns. Excess balance auto-converts to FD.",
    interestRate: "6% - 7% p.a.",
    features: ["Auto-sweep", "Liquidity maintained", "Higher returns", "No manual effort"],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER]
  },
  {
    type: "liquid_fund",
    name: "Liquid Mutual Funds",
    description: "Ultra-short-term debt funds for parking surplus money with easy withdrawal.",
    interestRate: "5% - 7% p.a.",
    features: ["Same-day redemption", "No lock-in", "Better than savings", "Tax efficient"],
    suitableFor: [UserType.WORKING_PROFESSIONAL, UserType.SMALL_BUSINESS_OWNER]
  },
  {
    type: "post_office_savings",
    name: "Post Office Savings",
    description: "Government-backed savings account available at any post office.",
    interestRate: "4% p.a.",
    features: ["Government guarantee", "Wide network", "Low minimum", "Safe"],
    suitableFor: [UserType.STUDENT, UserType.RETIREE]
  },
];

// =============================================================================
// RECOMMENDATION ENGINE
// =============================================================================

/**
 * Filter government schemes based on user profile
 */
function filterSchemes(
  userType: UserType,
  monthlyIncome: number,
  goals: FinancialGoal[]
): GovernmentScheme[] {
  const relevantSchemes: GovernmentScheme[] = [];

  // Category mapping based on user type
  const userTypeCategories: Record<UserType, string[]> = {
    [UserType.STUDENT]: ['education', 'social_welfare'],
    [UserType.WORKING_PROFESSIONAL]: ['finance_subsidy', 'housing', 'healthcare', 'employment'],
    [UserType.RETIREE]: ['senior_citizen', 'healthcare', 'finance_subsidy'],
    [UserType.SMALL_BUSINESS_OWNER]: ['msme_business', 'finance_subsidy', 'employment'],
  };

  const relevantCategories = userTypeCategories[userType] || [];

  // Filter schemes
  for (const scheme of GOVERNMENT_SCHEMES) {
    // Check if category matches
    if (relevantCategories.includes(scheme.category)) {
      relevantSchemes.push(scheme);
      continue;
    }

    // Check if target beneficiaries match
    const beneficiaries = scheme.target_beneficiaries.toLowerCase();
    if (
      (userType === UserType.STUDENT && beneficiaries.includes('student')) ||
      (userType === UserType.RETIREE && (beneficiaries.includes('senior') || beneficiaries.includes('elderly'))) ||
      (userType === UserType.SMALL_BUSINESS_OWNER && (beneficiaries.includes('entrepreneur') || beneficiaries.includes('business')))
    ) {
      relevantSchemes.push(scheme);
    }
  }

  // Always include essential schemes
  const essentialSchemes = ['Ayushman Bharat', 'Jan Dhan', 'Atal Pension'];
  for (const scheme of GOVERNMENT_SCHEMES) {
    if (essentialSchemes.some(name => scheme.scheme_name.includes(name))) {
      if (!relevantSchemes.find(s => s.scheme_name === scheme.scheme_name)) {
        relevantSchemes.push(scheme);
      }
    }
  }

  return relevantSchemes.slice(0, 10); // Return top 10
}

/**
 * Filter loan recommendations based on user profile
 */
function filterLoans(
  userType: UserType,
  riskTolerance: RiskTolerance,
  goals: FinancialGoal[]
): LoanRecommendation[] {
  return LOAN_TYPES.filter(loan => {
    // Match user type
    if (!loan.suitableFor.includes(userType)) {
      return false;
    }

    // Match risk tolerance
    if (riskTolerance === RiskTolerance.LOW && loan.riskLevel === RiskTolerance.HIGH) {
      return false;
    }

    return true;
  }).slice(0, 5);
}

/**
 * Filter investment recommendations based on user profile
 */
function filterInvestments(
  userType: UserType,
  riskTolerance: RiskTolerance,
  goals: FinancialGoal[],
  monthlyIncome: number
): InvestmentRecommendation[] {
  return INVESTMENT_OPTIONS.filter(investment => {
    // Match user type
    if (!investment.suitableFor.includes(userType)) {
      return false;
    }

    // Match risk tolerance
    if (riskTolerance === RiskTolerance.LOW && investment.riskLevel === RiskTolerance.HIGH) {
      return false;
    }
    if (riskTolerance === RiskTolerance.HIGH && investment.riskLevel === RiskTolerance.LOW) {
      // Still show some low-risk options
      return Math.random() > 0.5;
    }

    // Match goals if specified
    if (goals.length > 0) {
      const hasMatchingGoal = investment.goals.some(g => goals.includes(g));
      if (!hasMatchingGoal) {
        return Math.random() > 0.7; // Include some anyway
      }
    }

    return true;
  }).sort((a, b) => {
    // Prioritize by goal match
    const aGoalMatch = goals.filter(g => a.goals.includes(g)).length;
    const bGoalMatch = goals.filter(g => b.goals.includes(g)).length;
    return bGoalMatch - aGoalMatch;
  }).slice(0, 6);
}

/**
 * Filter savings recommendations
 */
function filterSavings(userType: UserType): SavingsRecommendation[] {
  return SAVINGS_OPTIONS.filter(saving => 
    saving.suitableFor.includes(userType)
  ).slice(0, 3);
}

/**
 * Generate personalized financial tips
 */
function generateTips(
  userType: UserType,
  monthlyIncome: number,
  riskTolerance: RiskTolerance,
  profile?: FinancialProfile
): string[] {
  const tips: string[] = [];

  // Income-based tips
  if (monthlyIncome > 0) {
    tips.push(`Save at least ${monthlyIncome < 50000 ? '20%' : '30%'} of your monthly income`);
    tips.push(`Build an emergency fund of ${(monthlyIncome * 6).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} (6 months expenses)`);
  }

  // User type specific tips
  switch (userType) {
    case UserType.STUDENT:
      tips.push("Start SIPs early - even Rs 500/month grows significantly over time");
      tips.push("Look into education loans with moratorium periods");
      tips.push("Apply for scholarships on the National Scholarship Portal");
      break;
    case UserType.WORKING_PROFESSIONAL:
      tips.push("Maximize your 80C deductions (Rs 1.5 lakh limit)");
      tips.push("Consider NPS for additional Rs 50,000 tax benefit under 80CCD(1B)");
      tips.push("Get adequate term insurance cover (10x annual income)");
      break;
    case UserType.RETIREE:
      tips.push("Prioritize capital preservation over high returns");
      tips.push("Consider Senior Citizen Savings Scheme for best rates");
      tips.push("Ensure adequate health insurance coverage");
      break;
    case UserType.SMALL_BUSINESS_OWNER:
      tips.push("Separate personal and business finances");
      tips.push("Look into MUDRA loans for business expansion");
      tips.push("Register on GeM portal for government contracts");
      break;
  }

  // Risk tolerance tips
  if (riskTolerance === RiskTolerance.LOW) {
    tips.push("Stick to government-backed schemes like PPF, SCSS");
  } else if (riskTolerance === RiskTolerance.HIGH) {
    tips.push("Diversify across equity, debt, and gold");
  }

  return tips.slice(0, 5);
}

// =============================================================================
// MAIN RECOMMENDATION FUNCTION
// =============================================================================

/**
 * Generate comprehensive financial recommendations based on user profile
 */
export function getFinancialRecommendations(
  userType: UserType,
  monthlyIncome: number,
  riskTolerance: RiskTolerance,
  goals: FinancialGoal[] = [],
  profile?: FinancialProfile
): FinancialRecommendations {
  return {
    schemes: filterSchemes(userType, monthlyIncome, goals),
    loans: filterLoans(userType, riskTolerance, goals),
    investments: filterInvestments(userType, riskTolerance, goals, monthlyIncome),
    savings: filterSavings(userType),
    tips: generateTips(userType, monthlyIncome, riskTolerance, profile),
  };
}

/**
 * Get schemes by category
 */
export function getSchemesByCategory(category: string): GovernmentScheme[] {
  return GOVERNMENT_SCHEMES.filter(s => s.category === category);
}

/**
 * Search schemes by keyword
 */
export function searchSchemes(keyword: string): GovernmentScheme[] {
  const lower = keyword.toLowerCase();
  return GOVERNMENT_SCHEMES.filter(s =>
    s.scheme_name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.benefits.toLowerCase().includes(lower)
  );
}

/**
 * Get all available categories
 */
export function getSchemeCategories(): string[] {
  const categories = new Set(GOVERNMENT_SCHEMES.map(s => s.category));
  return Array.from(categories).sort();
}

export default {
  getFinancialRecommendations,
  getSchemesByCategory,
  searchSchemes,
  getSchemeCategories,
  GOVERNMENT_SCHEMES,
  LOAN_TYPES,
  INVESTMENT_OPTIONS,
  SAVINGS_OPTIONS,
};
