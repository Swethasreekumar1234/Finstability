/**
 * Auth store using Zustand for state management
 * Equivalent to AuthViewModel in the Kotlin version
 */

import { create } from 'zustand';
import { User, UserType, RiskTolerance, OtpState } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  // Phone Login State
  phoneNumber: string;
  phoneError: string | null;

  // OTP State
  otpState: OtpState;
  enteredOtp: string;
  otpError: string | null;

  // Profile Setup State
  fullName: string;
  email: string;
  selectedUserType: UserType | null;
  monthlyIncome: string;
  selectedRiskTolerance: RiskTolerance | null;
  profileError: string | null;
  isProfileSaving: boolean;

  // User Data
  currentUser: User | null;
  isLoggedIn: boolean;
  isInitialized: boolean;

  // Actions
  updatePhoneNumber: (phone: string) => void;
  sendOtp: () => Promise<boolean>;
  updateEnteredOtp: (otp: string) => void;
  verifyOtp: () => Promise<{ success: boolean; isNewUser: boolean }>;
  resendOtp: () => Promise<void>;

  // Profile Actions
  updateFullName: (name: string) => void;
  updateEmail: (email: string) => void;
  updateUserType: (type: UserType) => void;
  updateMonthlyIncome: (income: string) => void;
  updateRiskTolerance: (risk: RiskTolerance) => void;
  saveProfile: () => Promise<boolean>;

  // User Actions
  loadUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  resetAuthState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial State
  phoneNumber: '',
  phoneError: null,
  otpState: OtpState.IDLE,
  enteredOtp: '',
  otpError: null,
  fullName: '',
  email: '',
  selectedUserType: null,
  monthlyIncome: '',
  selectedRiskTolerance: null,
  profileError: null,
  isProfileSaving: false,
  currentUser: null,
  isLoggedIn: false,
  isInitialized: false,

  // Phone Number Actions
  updatePhoneNumber: (phone: string) => {
    const filtered = phone.replace(/\D/g, '').slice(0, 10);
    set({ phoneNumber: filtered, phoneError: null });
  },

  sendOtp: async () => {
    const { phoneNumber } = get();

    if (!phoneNumber) {
      set({ phoneError: 'Phone number is required' });
      return false;
    }

    if (!authService.isValidPhoneNumber(phoneNumber)) {
      set({ phoneError: 'Please enter a valid 10-digit phone number' });
      return false;
    }

    set({ phoneError: null, otpState: OtpState.SENDING });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    authService.generateOtp(phoneNumber);
    set({ otpState: OtpState.SENT });

    return true;
  },

  // OTP Actions
  updateEnteredOtp: (otp: string) => {
    const filtered = otp.replace(/\D/g, '').slice(0, 6);
    set({ enteredOtp: filtered, otpError: null });
  },

  verifyOtp: async () => {
    const { enteredOtp } = get();

    if (enteredOtp.length !== 6) {
      set({ otpError: 'Please enter all 6 digits' });
      return { success: false, isNewUser: false };
    }

    set({ otpState: OtpState.VERIFYING });

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (authService.verifyOtp(enteredOtp)) {
      set({ otpState: OtpState.VERIFIED });
      await authService.setLoggedIn(authService.getCurrentPhoneNumber());

      const profileExists = await authService.isUserProfileExists();

      if (profileExists) {
        await get().loadUserProfile();
        set({ isLoggedIn: true });
        return { success: true, isNewUser: false };
      } else {
        return { success: true, isNewUser: true };
      }
    } else {
      set({
        otpState: OtpState.ERROR,
        otpError: 'Invalid OTP. Please try again.',
      });
      return { success: false, isNewUser: false };
    }
  },

  resendOtp: async () => {
    set({ otpState: OtpState.SENDING, enteredOtp: '', otpError: null });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    authService.generateOtp(authService.getCurrentPhoneNumber());
    set({ otpState: OtpState.SENT });
  },

  // Profile Actions
  updateFullName: (name: string) => {
    set({ fullName: name, profileError: null });
  },

  updateEmail: (email: string) => {
    set({ email });
  },

  updateUserType: (type: UserType) => {
    set({ selectedUserType: type, profileError: null });
  },

  updateMonthlyIncome: (income: string) => {
    const filtered = income.replace(/[^0-9.]/g, '');
    set({ monthlyIncome: filtered, profileError: null });
  },

  updateRiskTolerance: (risk: RiskTolerance) => {
    set({ selectedRiskTolerance: risk, profileError: null });
  },

  saveProfile: async () => {
    const { fullName, email, selectedUserType, monthlyIncome, selectedRiskTolerance, phoneNumber } =
      get();

    // Validation
    if (!fullName.trim()) {
      set({ profileError: 'Full name is required' });
      return false;
    }

    if (!selectedUserType) {
      set({ profileError: 'Please select your profile type' });
      return false;
    }

    if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) {
      set({ profileError: 'Please enter a valid monthly income' });
      return false;
    }

    if (!selectedRiskTolerance) {
      set({ profileError: 'Please select your risk tolerance level' });
      return false;
    }

    set({ isProfileSaving: true, profileError: null });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const user: Omit<User, 'createdAt'> = {
        phoneNumber: phoneNumber || authService.getCurrentPhoneNumber(),
        fullName: fullName.trim(),
        email: email.trim(),
        userType: selectedUserType,
        monthlyIncome: parseFloat(monthlyIncome),
        riskTolerance: selectedRiskTolerance,
      };

      await authService.saveUserProfile(user);
      await get().loadUserProfile();

      set({ isProfileSaving: false, isLoggedIn: true });
      return true;
    } catch (error) {
      set({
        isProfileSaving: false,
        profileError: 'Failed to save profile. Please try again.',
      });
      return false;
    }
  },

  // User Actions
  loadUserProfile: async () => {
    const user = await authService.loadUserProfile();
    set({ currentUser: user });
  },

  logout: async () => {
    await authService.logout();
    set({
      phoneNumber: '',
      phoneError: null,
      otpState: OtpState.IDLE,
      enteredOtp: '',
      otpError: null,
      fullName: '',
      email: '',
      selectedUserType: null,
      monthlyIncome: '',
      selectedRiskTolerance: null,
      profileError: null,
      isProfileSaving: false,
      currentUser: null,
      isLoggedIn: false,
    });
  },

  initialize: async () => {
    const isLoggedIn = await authService.isLoggedIn();
    const profileExists = await authService.isUserProfileExists();

    if (isLoggedIn && profileExists) {
      const user = await authService.loadUserProfile();
      set({ isLoggedIn: true, currentUser: user, isInitialized: true });
    } else {
      set({ isLoggedIn: false, isInitialized: true });
    }
  },

  resetAuthState: () => {
    set({
      phoneError: null,
      otpState: OtpState.IDLE,
      enteredOtp: '',
      otpError: null,
    });
  },
}));
