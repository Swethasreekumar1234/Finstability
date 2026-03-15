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
  checkUserExists,
  getUserProfile,
  saveUserProfile,
  signOutUser,
  setPhoneForVerification,
} from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  signInWithGoogle: (idToken: string) => Promise<{ success: boolean; isNewUser: boolean }>;
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
      
      // Save UID to AsyncStorage
      await AsyncStorage.setItem('firebaseUid', uid);
      await AsyncStorage.setItem('phoneNumber', phoneNumber);

      // Check if user profile exists in Firestore
      const exists = await checkUserExists(uid);

      if (exists) {
        // Load existing profile
        await get().loadUserProfile();
        set({ isLoggedIn: true });
        return { success: true, isNewUser: false };
      } else {
        // New user - needs profile setup
        return { success: true, isNewUser: true };
      }
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
  signInWithGoogle: async (idToken: string) => {
    set({ isGoogleLoading: true, authError: null });

    try {
      const user = await signInWithGoogleCredential(idToken);
      const uid = user.uid;
      
      set({ firebaseUid: uid });
      
      // Save UID to AsyncStorage
      await AsyncStorage.setItem('firebaseUid', uid);
      
      // Pre-fill email from Google account
      if (user.email) {
        set({ email: user.email });
      }
      if (user.displayName) {
        set({ fullName: user.displayName });
      }

      // Check if user profile exists in Firestore
      const exists = await checkUserExists(uid);

      if (exists) {
        await get().loadUserProfile();
        set({ isLoggedIn: true, isGoogleLoading: false });
        return { success: true, isNewUser: false };
      } else {
        set({ isGoogleLoading: false });
        return { success: true, isNewUser: true };
      }
    } catch (error: any) {
      set({
        isGoogleLoading: false,
        authError: error.message || 'Google sign-in failed',
      });
      return { success: false, isNewUser: false };
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
      const uid = firebaseUid || await AsyncStorage.getItem('firebaseUid') || `local-${Date.now()}`;

      const profileData = {
        phoneNumber: phoneNumber || '',
        fullName: fullName.trim(),
        email: email.trim(),
        userType: selectedUserType,
        monthlyIncome: parseFloat(monthlyIncome),
        riskTolerance: selectedRiskTolerance,
      };

      // Save to local AsyncStorage first (always works)
      await AsyncStorage.multiSet([
        ['user_fullName', profileData.fullName],
        ['user_email', profileData.email],
        ['user_userType', profileData.userType],
        ['user_monthlyIncome', String(profileData.monthlyIncome)],
        ['user_riskTolerance', profileData.riskTolerance],
        ['user_phoneNumber', profileData.phoneNumber],
        ['isLoggedIn', 'true'],
      ]);
      
      // Try to save to Firestore (with timeout, won't block)
      try {
        await saveUserProfile(uid, profileData);
      } catch (firestoreError) {
        console.warn('Firestore save skipped:', firestoreError);
        // Continue anyway - local storage is saved
      }
      
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
      const uid = get().firebaseUid || await AsyncStorage.getItem('firebaseUid');
      
      if (!uid) return;

      const profile = await getUserProfile(uid);
      
      if (profile) {
        const user: User = {
          phoneNumber: profile.phoneNumber || '',
          fullName: profile.fullName || '',
          email: profile.email || '',
          userType: profile.userType as UserType,
          monthlyIncome: profile.monthlyIncome || 0,
          riskTolerance: profile.riskTolerance as RiskTolerance,
          createdAt: profile.createdAt?.toMillis?.() || Date.now(),
        };
        set({ currentUser: user });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },

  logout: async () => {
    try {
      await signOutUser();
      await AsyncStorage.multiRemove(['firebaseUid', 'phoneNumber']);
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
      const uid = await AsyncStorage.getItem('firebaseUid');
      
      if (uid) {
        set({ firebaseUid: uid });
        
        // Check if profile exists
        const exists = await checkUserExists(uid);
        
        if (exists) {
          await get().loadUserProfile();
          set({ isLoggedIn: true, isInitialized: true });
          return;
        }
      }
      
      set({ isLoggedIn: false, isInitialized: true });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoggedIn: false, isInitialized: true });
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
