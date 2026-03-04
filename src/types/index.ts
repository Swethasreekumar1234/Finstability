/**
 * Type definitions for Finstability app
 */

// User Types - equivalent to Kotlin enums
export enum UserType {
  STUDENT = 'STUDENT',
  RETIREE = 'RETIREE',
  SMALL_BUSINESS = 'SMALL_BUSINESS',
}

export const UserTypeLabels: Record<UserType, string> = {
  [UserType.STUDENT]: 'Student',
  [UserType.RETIREE]: 'Retiree',
  [UserType.SMALL_BUSINESS]: 'Small Business Owner',
};

// Risk Tolerance Levels
export enum RiskTolerance {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export const RiskToleranceLabels: Record<RiskTolerance, string> = {
  [RiskTolerance.LOW]: 'Low - Conservative',
  [RiskTolerance.MEDIUM]: 'Medium - Balanced',
  [RiskTolerance.HIGH]: 'High - Aggressive',
};

// User profile data
export interface User {
  phoneNumber: string;
  fullName: string;
  email: string;
  userType: UserType;
  monthlyIncome: number;
  riskTolerance: RiskTolerance;
  createdAt: number;
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
  PhoneLogin: undefined;
  OtpVerification: undefined;
  ProfileSetup: undefined;
  Dashboard: undefined;
};
