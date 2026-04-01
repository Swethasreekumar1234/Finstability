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
import { apiService } from '../services/apiService';
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

const normalizeIndianPhone = (phone: string): string => phone.replace(/\D/g, '').slice(-10);

const hasCompleteLocalProfile = async (): Promise<boolean> => {
  const values = await AsyncStorage.multiGet([
    'user_fullName',
    'user_userType',
    'user_monthlyIncome',
    'user_riskTolerance',
  ]);

  const map = Object.fromEntries(values);
  return Boolean(
    map.user_fullName?.trim() &&
      map.user_userType &&
      map.user_monthlyIncome &&
      parseFloat(map.user_monthlyIncome) > 0 &&
      map.user_riskTolerance
  );
};

const hasLocalProfileForIdentity = async (identity: {
  phoneNumber?: string;
  email?: string | null;
}): Promise<boolean> => {
  const complete = await hasCompleteLocalProfile();
  if (!complete) return false;

  const [storedPhone, storedEmail] = await AsyncStorage.multiGet(['user_phoneNumber', 'user_email']);
  const savedPhone = storedPhone[1] || '';
  const savedEmail = (storedEmail[1] || '').trim().toLowerCase();

  if (identity.phoneNumber) {
    return normalizeIndianPhone(savedPhone) === normalizeIndianPhone(identity.phoneNumber);
  }

  if (identity.email) {
    return savedEmail === identity.email.trim().toLowerCase();
  }

  return true;
};

const loadUserProfileFromLocal = async (): Promise<User | null> => {
  const values = await AsyncStorage.multiGet([
    'user_phoneNumber',
    'user_fullName',
    'user_email',
    'user_userType',
    'user_monthlyIncome',
    'user_riskTolerance',
  ]);

  const map = Object.fromEntries(values);
  const monthlyIncome = parseFloat(map.user_monthlyIncome || '0');

  if (!map.user_fullName || !map.user_userType || !map.user_riskTolerance || monthlyIncome <= 0) {
    return null;
  }

  return {
    phoneNumber: map.user_phoneNumber || '',
    fullName: map.user_fullName,
    email: map.user_email || '',
    userType: map.user_userType as UserType,
    monthlyIncome,
    riskTolerance: map.user_riskTolerance as RiskTolerance,
    createdAt: Date.now(),
  };
};

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

      // Check if user profile exists in Firestore or local storage
      const existsRemote = await checkUserExists(uid);
      const existsLocal = await hasLocalProfileForIdentity({ phoneNumber });

      if (existsRemote || existsLocal) {
        if (existsRemote) {
          await get().loadUserProfile();
        } else {
          const localUser = await loadUserProfileFromLocal();
          if (localUser) {
            set({ currentUser: localUser });
          }
        }
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

      // Check if user profile exists in Firestore or local storage
      const existsRemote = await checkUserExists(uid);
      const existsLocal = await hasLocalProfileForIdentity({ email: user.email });

      if (existsRemote || existsLocal) {
        if (existsRemote) {
          await get().loadUserProfile();
        } else {
          const localUser = await loadUserProfileFromLocal();
          if (localUser) {
            set({ currentUser: localUser });
          }
        }

        // Prefer the active Google account name in UI to avoid stale/local aliases.
        set((state) => {
          const googleName = user.displayName?.trim();
          const googleEmail = user.email?.trim();
          const current = state.currentUser;

          if (!current) {
            return {
              currentUser: {
                phoneNumber: '',
                fullName: googleName || 'User',
                displayName: googleName || 'User',
                email: googleEmail || '',
                userType: UserType.STUDENT,
                monthlyIncome: 0,
                riskTolerance: RiskTolerance.MODERATE,
                createdAt: Date.now(),
              },
            };
          }

          return {
            currentUser: {
              ...current,
              displayName: googleName || current.displayName || current.fullName,
              email: googleEmail || current.email,
            },
          };
        });

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

  signInWithEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      set({ authError: 'Please enter a valid email address' });
      return { success: false, message: 'Please enter a valid email address' };
    }

    set({ isGoogleLoading: true, authError: null });

    try {
      // Fast local check first for offline continuity.
      const localEntries = await AsyncStorage.multiGet([
        'firebaseUid',
        'user_email',
        'user_fullName',
        'user_userType',
        'user_monthlyIncome',
        'user_riskTolerance',
      ]);
      const localMap = Object.fromEntries(localEntries);
      const localEmail = (localMap.user_email || '').trim().toLowerCase();

      if (localEmail && localEmail === cleanEmail) {
        const localUser: User = {
          phoneNumber: '',
          fullName: localMap.user_fullName || 'User',
          displayName: localMap.user_fullName || 'User',
          email: cleanEmail,
          userType: (localMap.user_userType as UserType) || UserType.STUDENT,
          monthlyIncome: parseFloat(localMap.user_monthlyIncome || '0'),
          riskTolerance: (localMap.user_riskTolerance as RiskTolerance) || RiskTolerance.MODERATE,
          createdAt: Date.now(),
        };

        set({
          firebaseUid: localMap.firebaseUid || `email-${Date.now()}`,
          currentUser: localUser,
          isLoggedIn: true,
          isGoogleLoading: false,
        });

        return { success: true };
      }

      const profile = await apiService.getProfileByEmail(cleanEmail);
      if (!profile) {
        set({
          isGoogleLoading: false,
          authError: 'No account found with this email. Please create your account.',
        });
        return { success: false, message: 'No account found' };
      }

      const userId = profile.user_id || profile.firebase_uid || `email-${Date.now()}`;
      const resolvedName = profile.display_name || profile.full_name || profile.name || 'User';
      const resolvedUserType = (profile.user_type as UserType) || UserType.STUDENT;
      const resolvedRisk = (profile.risk_tolerance as RiskTolerance) || RiskTolerance.MODERATE;
      const resolvedIncome = Number(profile.monthly_income || 0);

      await AsyncStorage.multiSet([
        ['firebaseUid', userId],
        ['user_fullName', resolvedName],
        ['user_email', cleanEmail],
        ['user_userType', resolvedUserType],
        ['user_monthlyIncome', String(resolvedIncome)],
        ['user_riskTolerance', resolvedRisk],
      ]);

      const signedUser: User = {
        phoneNumber: profile.phone_number || '',
        fullName: resolvedName,
        displayName: resolvedName,
        email: cleanEmail,
        userType: resolvedUserType,
        monthlyIncome: resolvedIncome,
        riskTolerance: resolvedRisk,
        createdAt: Date.now(),
      };

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

      // Try Mongo persistence, but don't block signup if backend is offline.
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
      } catch (mongoError) {
        console.warn('Email signup Mongo save skipped:', mongoError);
      }

      await AsyncStorage.multiSet([
        ['firebaseUid', userId],
        ['user_fullName', cleanName],
        ['user_email', cleanEmail],
        ['user_userType', UserType.STUDENT],
        ['user_monthlyIncome', '0'],
        ['user_riskTolerance', RiskTolerance.MODERATE],
      ]);

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

      // Sync to backend MongoDB (non-blocking for UX)
      try {
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
      } catch (mongoError) {
        console.warn('Mongo profile sync skipped:', mongoError);
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
        const resolvedName = profile.displayName || profile.fullName || profile.full_name || profile.name || '';
        const user: User = {
          phoneNumber: profile.phoneNumber || '',
          fullName: resolvedName,
          displayName: resolvedName,
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

      // Require explicit login on app launch instead of silent auto-login.
      if (uid) {
        try {
          await signOutUser();
        } catch (error) {
          console.warn('Session sign-out on init failed:', error);
        }
      }

      await AsyncStorage.multiRemove(['firebaseUid', 'phoneNumber']);
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
