/**
 * Auth store using Zustand for state management
 * Firebase Authentication with Phone OTP and Google Sign-In
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserType, RiskTolerance, OtpState, FinancialProfile } from '../types';
import {
  sendOtpToPhone,
  verifyOtpAndSignIn,
  signInWithGoogleCredential,
  signOutUser,
  setPhoneForVerification,
} from '../config/firebase';
import { apiService } from '../services/apiService';

const FINANCIAL_PROFILE_KEY = 'financial_profile';
const AUTH_SESSION_KEY = 'auth_session';

type AuthSession = {
  userId: string;
  email?: string;
  fullName?: string;
};

const normalizeEmail = (value?: string | null): string => (value || '').trim().toLowerCase();

const deriveStableUserId = (firebaseUid?: string | null, email?: string | null): string => {
  const normalizedEmail = normalizeEmail(email);
  if (firebaseUid && firebaseUid.trim()) return firebaseUid.trim();
  if (normalizedEmail) return `email:${normalizedEmail}`;
  return `guest:${Date.now()}`;
};

const persistAuthSession = async (session: AuthSession) => {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
};

const loadPersistedAuthSession = async (): Promise<AuthSession | null> => {
  const rawSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    return null;
  }
};

const buildLocalUser = (fullName: string, email: string): User => {
  const displayName = fullName.trim() || email.trim() || 'User';

  return {
    phoneNumber: '',
    fullName: displayName,
    displayName,
    email,
    userType: UserType.STUDENT,
    monthlyIncome: 0,
    riskTolerance: RiskTolerance.MODERATE,
    createdAt: Date.now(),
  };
};

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
  saveProfile: (overrides?: {
    state?: string;
    city?: string;
    age?: number;
    ageConfirmed?: boolean;
    gender?: string;
    ageBand?: string;
    employmentType?: string;
    occupation?: string;
    householdSize?: number;
    housingStatus?: string;
    incomeRange?: string;
    incomeRegular?: boolean;
    earningMembers?: number;
    hasBankAccount?: boolean;
    hasLand?: boolean;
    financialGoals?: string[];
    hasLifeInsurance?: boolean;
    hasHealthInsurance?: boolean;
    hasPpf?: boolean;
    hasFd?: boolean;
    hasMutualFunds?: boolean;
    hasGoldInvestments?: boolean;
  }) => Promise<boolean>;

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

const backendProfileToFinancialProfile = (profile: any): FinancialProfile => ({
  monthlyIncome: Number(profile?.monthly_income ?? 0),
  monthlyExpenses: Number(profile?.monthly_expenses ?? 0),
  totalSavings: Number(profile?.total_savings ?? 0),
  existingLoans: Number(profile?.existing_loans ?? profile?.total_debts ?? 0),
  employmentType: String(profile?.employment_type ?? 'FULL_TIME').toUpperCase() as FinancialProfile['employmentType'],
  riskTolerance: String(profile?.risk_tolerance ?? 'MODERATE').toUpperCase() as FinancialProfile['riskTolerance'],
  investmentExperience: Number(profile?.investment_experience ?? 0),
  financialGoals: Array.isArray(profile?.financial_goals) ? profile.financial_goals : [],
  updatedAt: String(profile?.updated_at_client ?? profile?.updated_at ?? new Date().toISOString()),
});

const persistFinancialProfile = async (profile: any) => {
  const mapped = backendProfileToFinancialProfile(profile);
  await AsyncStorage.setItem(FINANCIAL_PROFILE_KEY, JSON.stringify(mapped));
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
      const normalizedEmail = normalizeEmail(user.email || '');

      const existingProfileByUserId = await apiService.getProfileByUserId(uid);
      const existingProfileByEmail = !existingProfileByUserId && normalizedEmail
        ? await apiService.getProfileByEmail(normalizedEmail)
        : null;
      const existingProfile = existingProfileByUserId || existingProfileByEmail;

      const resolvedUserId = String(
        existingProfile?.user_id || existingProfile?.firebase_uid || uid
      );

      const profilePayload: any = {
        user_id: resolvedUserId,
        firebase_uid: resolvedUserId,
        name: existingProfile?.name || user.displayName || normalizedEmail || 'User',
        full_name: existingProfile?.full_name || user.displayName || normalizedEmail || 'User',
        display_name: existingProfile?.display_name || user.displayName || normalizedEmail || 'User',
        email: normalizedEmail,
        phone_number: existingProfile?.phone_number || user.phoneNumber || '',
        user_type: existingProfile?.user_type || UserType.STUDENT,
        risk_tolerance: existingProfile?.risk_tolerance || RiskTolerance.MODERATE,
      };

      if (existingProfile) {
        Object.assign(profilePayload, {
          age: existingProfile.age,
          age_confirmed: existingProfile.age_confirmed ?? false,
          gender: existingProfile.gender,
          state: existingProfile.state || 'Delhi',
          occupation: existingProfile.occupation || 'salaried',
          employment_type: existingProfile.employment_type || 'salaried',
          monthly_income: Number(existingProfile.monthly_income ?? 0),
          monthly_expenses: Number(existingProfile.monthly_expenses ?? 0),
          total_savings: Number(existingProfile.total_savings ?? 0),
          total_debts: Number(existingProfile.total_debts ?? existingProfile.existing_loans ?? 0),
          existing_loans: Number(existingProfile.existing_loans ?? existingProfile.total_debts ?? 0),
          financial_goals: Array.isArray(existingProfile.financial_goals) ? existingProfile.financial_goals : [],
          investment_experience: Number(existingProfile.investment_experience ?? 0),
          family_size: Number(existingProfile.family_size ?? 1),
        });
      }

      let savedProfile = existingProfile;
      try {
        await apiService.saveProfile(profilePayload);
        savedProfile = await apiService.getProfileByUserId(resolvedUserId)
          || (normalizedEmail ? await apiService.getProfileByEmail(normalizedEmail) : null)
          || existingProfile;
      } catch (syncError: any) {
        console.warn('Google profile sync failed, continuing with Firebase session:', syncError?.message || syncError);
      }

      const currentUser = savedProfile ? backendProfileToUser(savedProfile) : backendProfileToUser(profilePayload);
      if (savedProfile) {
        await persistFinancialProfile(savedProfile);
      }

      const resolvedUid = String(savedProfile?.user_id || savedProfile?.firebase_uid || resolvedUserId);
      const resolvedEmail = normalizeEmail(savedProfile?.email || normalizedEmail);
      await persistAuthSession({
        userId: resolvedUid,
        email: resolvedEmail || undefined,
        fullName: currentUser.fullName,
      });

      set({
        firebaseUid: resolvedUid,
        email: resolvedEmail,
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
        const persistedSession = await loadPersistedAuthSession();
        if (persistedSession && normalizeEmail(persistedSession.email) === cleanEmail) {
          const fallbackUser = buildLocalUser(persistedSession.fullName || cleanEmail, cleanEmail);

          await persistAuthSession({
            userId: persistedSession.userId,
            email: cleanEmail,
            fullName: persistedSession.fullName || fallbackUser.fullName,
          });

          set({
            firebaseUid: persistedSession.userId,
            email: cleanEmail,
            fullName: persistedSession.fullName || fallbackUser.fullName,
            currentUser: fallbackUser,
            isLoggedIn: true,
            isGoogleLoading: false,
          });

          return { success: true };
        }

        const backendAvailable = await apiService.isAvailable();
        set({
          isGoogleLoading: false,
          authError: backendAvailable
            ? 'No account found with this email. Please create your account.'
            : 'Sync is temporarily unavailable. Please try again once the backend is reachable.',
        });
        return {
          success: false,
          message: backendAvailable ? 'No account found' : 'Sync temporarily unavailable',
        };
      }

      const userId = String(profile.user_id || profile.firebase_uid || `email:${cleanEmail}`);
      const signedUser = backendProfileToUser(profile);
      await persistFinancialProfile(profile);
      await persistAuthSession({
        userId,
        email: cleanEmail,
        fullName: signedUser.fullName,
      });

      set({
        firebaseUid: userId,
        email: cleanEmail,
        fullName: signedUser.fullName,
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
      const userId = `email:${cleanEmail}`;

      // Save directly to MongoDB through the backend.
      const profilePayload = {
        user_id: userId,
        firebase_uid: userId,
        name: cleanName,
        full_name: cleanName,
        display_name: cleanName,
        email: cleanEmail,
        phone_number: '',
        user_type: UserType.STUDENT,
        risk_tolerance: RiskTolerance.MODERATE,
        age_confirmed: false,
        state: 'Delhi',
        occupation: 'student',
        employment_type: 'student',
        monthly_income: 0,
        monthly_expenses: 0,
        total_savings: 0,
        total_debts: 0,
        family_size: 1,
      };
      try {
        await apiService.saveProfile(profilePayload);
      } catch (mongoError: any) {
        console.warn('Backend profile sync failed, continuing with local signup:', mongoError);
      }

      await persistFinancialProfile(profilePayload);
      await persistAuthSession({
        userId,
        email: cleanEmail,
        fullName: cleanName,
      });

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
        email: cleanEmail,
        fullName: cleanName,
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

  saveProfile: async (overrides = {}) => {
    const { 
      fullName, email, selectedUserType, monthlyIncome, 
      selectedRiskTolerance, phoneNumber, firebaseUid, currentUser
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
      const uid = deriveStableUserId(firebaseUid, email || currentUser?.email || null);

      const profileData = {
        phoneNumber: phoneNumber || '',
        fullName: fullName.trim(),
        email: email.trim(),
        userType: selectedUserType,
        monthlyIncome: parseFloat(monthlyIncome),
        riskTolerance: selectedRiskTolerance,
      };

      const backendProfile = {
        user_id: uid,
        firebase_uid: uid,
        name: profileData.fullName,
        full_name: profileData.fullName,
        display_name: profileData.fullName,
        email: profileData.email,
        phone_number: profileData.phoneNumber,
        user_type: profileData.userType,
        risk_tolerance: profileData.riskTolerance,
        employment_type: (overrides.employmentType || 'salaried').toLowerCase(),
        monthly_income: profileData.monthlyIncome,
        monthly_expenses: 0,
        total_savings: 0,
        total_debts: 0,
        family_size: overrides.householdSize || 1,
        age: overrides.age,
        age_confirmed: overrides.ageConfirmed ?? typeof overrides.age === 'number',
        gender: overrides.gender,
        state: overrides.state || 'Delhi',
        occupation: overrides.occupation || 'salaried',
        city: overrides.city,
        age_band: overrides.ageBand,
        household_size: overrides.householdSize || 1,
        housing_status: overrides.housingStatus,
        income_range: overrides.incomeRange,
        income_regular: overrides.incomeRegular,
        earning_members: overrides.earningMembers,
        has_bank_account: overrides.hasBankAccount,
        has_land: overrides.hasLand,
        financial_goals: overrides.financialGoals,
        has_life_insurance: overrides.hasLifeInsurance,
        has_health_insurance: overrides.hasHealthInsurance,
        has_ppf: overrides.hasPpf,
        has_fd: overrides.hasFd,
        has_mutual_funds: overrides.hasMutualFunds,
        has_gold_investments: overrides.hasGoldInvestments,
      };

      try {
        await apiService.saveProfile(backendProfile);
      } catch (backendError) {
        console.warn('Backend profile sync failed, saving locally:', backendError);
      }

      await persistFinancialProfile(backendProfile);
      await persistAuthSession({
        userId: uid,
        email: normalizeEmail(profileData.email) || undefined,
        fullName: profileData.fullName,
      });
      
      // Update local state
      const user: User = {
        ...profileData,
        createdAt: Date.now(),
      };
      
      set({ 
        firebaseUid: uid,
        email: normalizeEmail(profileData.email),
        currentUser: user, 
        isProfileSaving: false, 
        isLoggedIn: true 
      });
      
      return true;
    } catch (error: any) {
      set({
        isProfileSaving: false,
        profileError: error?.message || 'Failed to save profile',
      });
      return false;
    }
  },

  // User Actions
  loadUserProfile: async () => {
    try {
      const { email, firebaseUid } = get();
      const normalizedEmail = normalizeEmail(email);
      const profileByUserId = firebaseUid ? await apiService.getProfileByUserId(firebaseUid) : null;
      const profileByEmail = !profileByUserId && normalizedEmail
        ? await apiService.getProfileByEmail(normalizedEmail)
        : null;
      const profile = profileByUserId || profileByEmail;
      if (profile) {
        const resolvedUid = String(profile.user_id || profile.firebase_uid || firebaseUid || deriveStableUserId(null, normalizedEmail));
        const resolvedEmail = normalizeEmail(profile.email || normalizedEmail);
        await persistFinancialProfile(profile);
        await persistAuthSession({
          userId: resolvedUid,
          email: resolvedEmail || undefined,
          fullName: profile.display_name || profile.full_name || profile.name || undefined,
        });
        set({
          firebaseUid: resolvedUid,
          email: resolvedEmail,
          fullName: profile.display_name || profile.full_name || profile.name || '',
          currentUser: backendProfileToUser(profile),
          isLoggedIn: true,
        });
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

    try {
      await AsyncStorage.removeItem(FINANCIAL_PROFILE_KEY);
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      // Best-effort cleanup only.
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
      const rawSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      if (!rawSession) {
        set({ isInitialized: true });
        return;
      }

      const parsed = JSON.parse(rawSession) as AuthSession;
      const sessionUserId = String(parsed?.userId || '').trim();
      const sessionEmail = normalizeEmail(parsed?.email);
      const profileByUserId = sessionUserId ? await apiService.getProfileByUserId(sessionUserId) : null;
      const profileByEmail = !profileByUserId && sessionEmail
        ? await apiService.getProfileByEmail(sessionEmail)
        : null;
      const profile = profileByUserId || profileByEmail;

      if (profile) {
        const resolvedUid = String(profile.user_id || profile.firebase_uid || sessionUserId || deriveStableUserId(null, sessionEmail));
        const resolvedEmail = normalizeEmail(profile.email || sessionEmail);
        await persistFinancialProfile(profile);
        await persistAuthSession({
          userId: resolvedUid,
          email: resolvedEmail || undefined,
          fullName: profile.display_name || profile.full_name || profile.name || parsed?.fullName,
        });
        set({
          firebaseUid: resolvedUid,
          email: resolvedEmail,
          fullName: profile.display_name || profile.full_name || profile.name || parsed?.fullName || '',
          currentUser: backendProfileToUser(profile),
          isLoggedIn: true,
          isInitialized: true,
        });
        return;
      }

      set({
        firebaseUid: sessionUserId || null,
        email: sessionEmail,
        fullName: parsed?.fullName || '',
        isInitialized: true,
      });
      return;
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
