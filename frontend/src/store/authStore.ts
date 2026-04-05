/**
 * Auth store using Zustand for state management
 * Firebase Authentication with Phone OTP and Google Sign-In
 */

import { create } from 'zustand';
import { User, UserType, RiskTolerance, OtpState } from '../types';
import {
  sendOtpToPhone,
  verifyOtpAndSignIn,
  signInWithGoogleCredential,
  signOutUser,
  setPhoneForVerification,
} from '../config/firebase';
import { apiService } from '../services/apiService';

interface AuthState {
  // Firebase User
  firebaseUid: string | null;
  
  // Phone Login State
  phoneNumber: string;
  phoneError: string | null;
  verificationId: string | null;

  // OTP State
  otpState: OtpState;
  enteredOtp: string;
  otpError: string | null;

  // Google Auth State
  isGoogleLoading: boolean;
  authError: string | null;

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

  // Phone Auth Actions
  updatePhoneNumber: (phone: string) => void;
  sendOtp: () => Promise<boolean>;
  updateEnteredOtp: (otp: string) => void;
  verifyOtp: () => Promise<{ success: boolean; isNewUser: boolean }>;
  resendOtp: () => Promise<void>;

  // Google Auth Actions
  signInWithGoogle: (tokens: { idToken?: string; accessToken?: string }) => Promise<{ success: boolean; isNewUser: boolean }>;
  signInWithEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  signUpWithEmail: (fullName: string, email: string) => Promise<{ success: boolean; message?: string }>;
  clearError: () => void;

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

const backendProfileToUser = (profile: any): User => ({
  phoneNumber: profile.phone_number || profile.phoneNumber || '',
  fullName: profile.display_name || profile.full_name || profile.name || 'User',
  displayName: profile.display_name || profile.full_name || profile.name || 'User',
  email: profile.email || '',
  userType: (profile.user_type as UserType) || UserType.STUDENT,
  monthlyIncome: Number(profile.monthly_income || profile.monthlyIncome || 0),
  riskTolerance: (profile.risk_tolerance as RiskTolerance) || (profile.riskTolerance as RiskTolerance) || RiskTolerance.MODERATE,
  createdAt: Date.now(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial State
  firebaseUid: null,
  phoneNumber: '',
  phoneError: null,
  verificationId: null,
  otpState: OtpState.IDLE,
  enteredOtp: '',
  otpError: null,
  isGoogleLoading: false,
  authError: null,
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

    if (phoneNumber.length !== 10 || !/^[6-9]\d{9}$/.test(phoneNumber)) {
      set({ phoneError: 'Please enter a valid 10-digit Indian mobile number' });
      return false;
    }

    set({ phoneError: null, otpState: OtpState.SENDING });

    try {
      // Store phone for verification reference
      setPhoneForVerification(phoneNumber);
      
      // Send OTP via Firebase
      const verId = await sendOtpToPhone(phoneNumber);
      set({ verificationId: verId, otpState: OtpState.SENT });
      return true;
    } catch (error: any) {
      set({
        phoneError: error.message || 'Failed to send OTP',
        otpState: OtpState.ERROR,
      });
      return false;
    }
  },

  // OTP Actions
  updateEnteredOtp: (otp: string) => {
    const filtered = otp.replace(/\D/g, '').slice(0, 6);
    set({ enteredOtp: filtered, otpError: null });
  },

  verifyOtp: async () => {
    const { enteredOtp, verificationId, phoneNumber } = get();

    if (enteredOtp.length !== 6) {
      set({ otpError: 'Please enter all 6 digits' });
      return { success: false, isNewUser: false };
    }

    set({ otpState: OtpState.VERIFYING, otpError: null });

    try {
      // Verify OTP with Firebase
      const user = await verifyOtpAndSignIn(enteredOtp, verificationId || undefined);
      const uid = user.uid;
      
      set({ 
        otpState: OtpState.VERIFIED,
        firebaseUid: uid,
      });

      return { success: true, isNewUser: true };
    } catch (error: any) {
      set({
        otpState: OtpState.ERROR,
        otpError: error.message || 'Invalid OTP. Please try again.',
      });
      return { success: false, isNewUser: false };
    }
  },

  resendOtp: async () => {
    const { phoneNumber } = get();
    set({ otpState: OtpState.SENDING, enteredOtp: '', otpError: null });

    try {
      const verId = await sendOtpToPhone(phoneNumber);
      set({ verificationId: verId, otpState: OtpState.SENT });
    } catch (error: any) {
      set({
        otpError: error.message || 'Failed to resend OTP',
        otpState: OtpState.ERROR,
      });
    }
  },

  // Google Sign-In
  signInWithGoogle: async ({ idToken, accessToken }) => {
    set({ isGoogleLoading: true, authError: null });

    try {
      const user = await signInWithGoogleCredential(idToken, accessToken);
      const uid = user.uid;

      const profilePayload = {
        user_id: uid,
        firebase_uid: uid,
        name: user.displayName || user.email || 'User',
        full_name: user.displayName || user.email || 'User',
        display_name: user.displayName || user.email || 'User',
        email: user.email || '',
        phone_number: user.phoneNumber || '',
        user_type: UserType.STUDENT,
        risk_tolerance: RiskTolerance.MODERATE,
        age: 25,
        gender: 'other',
        state: 'Delhi',
        occupation: 'salaried',
        employment_type: 'salaried',
        monthly_income: 0,
        monthly_expenses: 0,
        total_savings: 0,
        total_debts: 0,
        family_size: 1,
      };

      await apiService.saveProfile(profilePayload);

      const savedProfile = await apiService.getProfileByEmail(user.email || '');
      const currentUser = savedProfile ? backendProfileToUser(savedProfile) : backendProfileToUser(profilePayload);

      set({
        firebaseUid: uid,
        email: user.email || '',
        fullName: user.displayName || user.email || 'User',
        currentUser,
        isLoggedIn: true,
        isGoogleLoading: false,
      });

      return { success: true, isNewUser: false };
    } catch (error: any) {
      set({
        isGoogleLoading: false,
        authError: error.message || 'Google sign-in failed',
      });
      return { success: false, isNewUser: false };
    }
  },

  signInWithEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      set({ authError: 'Please enter a valid email address' });
      return { success: false, message: 'Please enter a valid email address' };
    }

    set({ isGoogleLoading: true, authError: null });

    try {
      const profile = await apiService.getProfileByEmail(cleanEmail);
      if (!profile) {
        set({
          isGoogleLoading: false,
          authError: 'No account found with this email. Please create your account.',
        });
        return { success: false, message: 'No account found' };
      }

      const userId = profile.user_id || profile.firebase_uid || `email-${Date.now()}`;
      const signedUser = backendProfileToUser(profile);

      set({
        firebaseUid: userId,
        currentUser: signedUser,
        isLoggedIn: true,
        isGoogleLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      set({
        isGoogleLoading: false,
        authError: error?.message || 'Sign in failed. Please try again.',
      });
      return { success: false, message: error?.message || 'Sign in failed' };
    }
  },

  signUpWithEmail: async (fullName: string, email: string) => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      set({ authError: 'Full name is required' });
      return { success: false, message: 'Full name is required' };
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      set({ authError: 'Please enter a valid email' });
      return { success: false, message: 'Please enter a valid email' };
    }

    set({ isGoogleLoading: true, authError: null });

    try {
      const userId = `email-${Date.now()}`;

      // Save directly to MongoDB through the backend.
      try {
        await apiService.saveProfile({
          user_id: userId,
          firebase_uid: userId,
          name: cleanName,
          full_name: cleanName,
          display_name: cleanName,
          email: cleanEmail,
          phone_number: '',
          user_type: UserType.STUDENT,
          risk_tolerance: RiskTolerance.MODERATE,
          age: 25,
          gender: 'other',
          state: 'Delhi',
          occupation: 'student',
          employment_type: 'student',
          monthly_income: 0,
          monthly_expenses: 0,
          total_savings: 0,
          total_debts: 0,
          family_size: 1,
        });
      } catch (mongoError: any) {
        set({
          isGoogleLoading: false,
          authError: mongoError?.message || 'Failed to save profile to MongoDB.',
        });
        return { success: false, message: mongoError?.message || 'Failed to save profile to MongoDB.' };
      }

      const newUser: User = {
        phoneNumber: '',
        fullName: cleanName,
        displayName: cleanName,
        email: cleanEmail,
        userType: UserType.STUDENT,
        monthlyIncome: 0,
        riskTolerance: RiskTolerance.MODERATE,
        createdAt: Date.now(),
      };

      set({
        firebaseUid: userId,
        currentUser: newUser,
        isLoggedIn: true,
        isGoogleLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      set({
        isGoogleLoading: false,
        authError: error?.message || 'Sign up failed. Please try again.',
      });
      return { success: false, message: error?.message || 'Sign up failed' };
    }
  },

  clearError: () => {
    set({ authError: null, phoneError: null, otpError: null });
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
    const { 
      fullName, email, selectedUserType, monthlyIncome, 
      selectedRiskTolerance, phoneNumber, firebaseUid 
    } = get();

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
      const uid = firebaseUid || `mongo-${Date.now()}`;

      const profileData = {
        phoneNumber: phoneNumber || '',
        fullName: fullName.trim(),
        email: email.trim(),
        userType: selectedUserType,
        monthlyIncome: parseFloat(monthlyIncome),
        riskTolerance: selectedRiskTolerance,
      };

      await apiService.saveProfile({
        user_id: uid,
        firebase_uid: uid,
        name: profileData.fullName,
        full_name: profileData.fullName,
        display_name: profileData.fullName,
        email: profileData.email,
        phone_number: profileData.phoneNumber,
        user_type: profileData.userType,
        risk_tolerance: profileData.riskTolerance,
        employment_type: 'salaried',
        monthly_income: profileData.monthlyIncome,
        monthly_expenses: 0,
        total_savings: 0,
        total_debts: 0,
        family_size: 1,
        age: 25,
        gender: 'other',
        state: 'Delhi',
        occupation: 'salaried',
      });
      
      // Update local state
      const user: User = {
        ...profileData,
        createdAt: Date.now(),
      };
      
      set({ 
        currentUser: user, 
        isProfileSaving: false, 
        isLoggedIn: true 
      });
      
      return true;
    } catch (error: any) {
      set({
        isProfileSaving: false,
        profileError: error.message || 'Failed to save profile. Please try again.',
      });
      return false;
    }
  },

  // User Actions
  loadUserProfile: async () => {
    try {
      const email = get().email;
      if (!email) return;

      const profile = await apiService.getProfileByEmail(email);
      if (profile) {
        set({ currentUser: backendProfileToUser(profile) });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },

  logout: async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    set({
      firebaseUid: null,
      phoneNumber: '',
      phoneError: null,
      verificationId: null,
      otpState: OtpState.IDLE,
      enteredOtp: '',
      otpError: null,
      isGoogleLoading: false,
      authError: null,
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
    try {
      set({ isInitialized: true });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isInitialized: true });
    }
  },

  resetAuthState: () => {
    set({
      phoneError: null,
      otpState: OtpState.IDLE,
      enteredOtp: '',
      otpError: null,
      authError: null,
    });
  },
}));
