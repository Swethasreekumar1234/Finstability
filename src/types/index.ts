/**
 * Type definitions for Finstability app
 */

// User Types - equivalent to Kotlin enums
export enum UserType {
  STUDENT = 'STUDENT',
  WORKING_PROFESSIONAL = 'WORKING_PROFESSIONAL',
  RETIREE = 'RETIREE',
  SMALL_BUSINESS_OWNER = 'SMALL_BUSINESS_OWNER',
}

export const UserTypeLabels: Record<UserType, string> = {
  [UserType.STUDENT]: 'Student',
  [UserType.WORKING_PROFESSIONAL]: 'Working Professional',
  [UserType.RETIREE]: 'Retiree',
  [UserType.SMALL_BUSINESS_OWNER]: 'Small Business Owner',
};

// Risk Tolerance Levels
export enum RiskTolerance {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
}

export const RiskToleranceLabels: Record<RiskTolerance, string> = {
  [RiskTolerance.LOW]: 'Conservative',
  [RiskTolerance.MODERATE]: 'Balanced',
  [RiskTolerance.HIGH]: 'Aggressive',
};

// Employment Types
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  FREELANCER = 'FREELANCER',
  UNEMPLOYED = 'UNEMPLOYED',
  RETIRED = 'RETIRED',
}

export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full-time Employee',
  [EmploymentType.PART_TIME]: 'Part-time Employee',
  [EmploymentType.SELF_EMPLOYED]: 'Self-employed',
  [EmploymentType.FREELANCER]: 'Freelancer',
  [EmploymentType.UNEMPLOYED]: 'Unemployed',
  [EmploymentType.RETIRED]: 'Retired',
};

// Financial Goals
export enum FinancialGoal {
  EMERGENCY_FUND = 'EMERGENCY_FUND',
  RETIREMENT = 'RETIREMENT',
  HOME_PURCHASE = 'HOME_PURCHASE',
  DEBT_FREE = 'DEBT_FREE',
  INVESTMENT = 'INVESTMENT',
  EDUCATION = 'EDUCATION',
  TRAVEL = 'TRAVEL',
  BUSINESS = 'BUSINESS',
}

export const FinancialGoalLabels: Record<FinancialGoal, string> = {
  [FinancialGoal.EMERGENCY_FUND]: 'Build Emergency Fund',
  [FinancialGoal.RETIREMENT]: 'Retirement Planning',
  [FinancialGoal.HOME_PURCHASE]: 'Buy a Home',
  [FinancialGoal.DEBT_FREE]: 'Become Debt-free',
  [FinancialGoal.INVESTMENT]: 'Grow Investments',
  [FinancialGoal.EDUCATION]: 'Education Fund',
  [FinancialGoal.TRAVEL]: 'Travel Fund',
  [FinancialGoal.BUSINESS]: 'Start a Business',
};

export const FinancialGoalIcons: Record<FinancialGoal, string> = {
  [FinancialGoal.EMERGENCY_FUND]: '◆',
  [FinancialGoal.RETIREMENT]: '○',
  [FinancialGoal.HOME_PURCHASE]: '□',
  [FinancialGoal.DEBT_FREE]: '▽',
  [FinancialGoal.INVESTMENT]: '△',
  [FinancialGoal.EDUCATION]: '◇',
  [FinancialGoal.TRAVEL]: '◎',
  [FinancialGoal.BUSINESS]: '■',
};

// Financial Profile Data
export interface FinancialProfile {
  monthlyIncome: number;
  existingLoans: number;
  totalSavings: number;
  monthlyExpenses: number;
  financialGoals: FinancialGoal[];
  riskTolerance: RiskTolerance;
  employmentType: EmploymentType;
  investmentExperience: number;
  updatedAt: string;
}

// User profile data
export interface User {
  phoneNumber: string;
  fullName: string;
  displayName?: string; // Alias for fullName for compatibility
  email: string;
  userType: UserType;
  monthlyIncome: number;
  riskTolerance: RiskTolerance;
  createdAt: number;
  financialProfile?: FinancialProfile;
}

// OTP states
export enum OtpState {
  IDLE = 'IDLE',
  SENDING = 'SENDING',
  SENT = 'SENT',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  ERROR = 'ERROR',
}

// Navigation param types
export type RootStackParamList = {
  Login: undefined;
  PhoneLogin: undefined;
  OtpVerification: { phoneNumber: string; verificationId: string };
  ProfileSetup: undefined;
  Dashboard: undefined;
  FinancialInput: undefined;
};
