/**
 * Auth service - handles OTP generation, verification, and user data storage
 * Equivalent to AuthRepository in the Kotlin version
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserType, RiskTolerance } from '../types';

const STORAGE_KEYS = {
  PHONE_NUMBER: 'phone_number',
  FULL_NAME: 'full_name',
  EMAIL: 'email',
  USER_TYPE: 'user_type',
  MONTHLY_INCOME: 'monthly_income',
  RISK_TOLERANCE: 'risk_tolerance',
  CREATED_AT: 'created_at',
  IS_LOGGED_IN: 'is_logged_in',
};

class AuthService {
  private currentOtp: string = '';
  private currentPhoneNumber: string = '';

  /**
   * Validates phone number format (10 digits)
   */
  isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  }

  /**
   * Generates a random 6-digit OTP and logs it for testing
   * In production, this would integrate with SMS gateway
   */
  generateOtp(phoneNumber: string): string {
    this.currentOtp = String(Math.floor(100000 + Math.random() * 900000));
    this.currentPhoneNumber = phoneNumber;

    console.log('========================================');
    console.log('OTP GENERATED FOR TESTING');
    console.log('Phone:', phoneNumber);
    console.log('OTP:', this.currentOtp);
    console.log('========================================');

    return this.currentOtp;
  }

  /**
   * Verifies the entered OTP against the generated OTP
   */
  verifyOtp(enteredOtp: string): boolean {
    const isValid = enteredOtp === this.currentOtp && this.currentOtp.length > 0;

    if (isValid) {
      console.log('OTP verified successfully for phone:', this.currentPhoneNumber);
    } else {
      console.log('OTP verification failed. Entered:', enteredOtp, 'Expected:', this.currentOtp);
    }

    return isValid;
  }

  /**
   * Gets the current phone number being authenticated
   */
  getCurrentPhoneNumber(): string {
    return this.currentPhoneNumber;
  }

  /**
   * Sets the logged in state
   */
  async setLoggedIn(phoneNumber: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, phoneNumber);
  }

  /**
   * Checks if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const isLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
    return isLoggedIn === 'true';
  }

  /**
   * Checks if a user profile exists
   */
  async isUserProfileExists(): Promise<boolean> {
    const fullName = await AsyncStorage.getItem(STORAGE_KEYS.FULL_NAME);
    return fullName !== null && fullName.length > 0;
  }

  /**
   * Saves user profile to AsyncStorage
   */
  async saveUserProfile(user: Omit<User, 'createdAt'>): Promise<void> {
    const createdAt = Date.now();

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PHONE_NUMBER, user.phoneNumber],
      [STORAGE_KEYS.FULL_NAME, user.fullName],
      [STORAGE_KEYS.EMAIL, user.email || ''],
      [STORAGE_KEYS.USER_TYPE, user.userType],
      [STORAGE_KEYS.MONTHLY_INCOME, String(user.monthlyIncome)],
      [STORAGE_KEYS.RISK_TOLERANCE, user.riskTolerance],
      [STORAGE_KEYS.CREATED_AT, String(createdAt)],
      [STORAGE_KEYS.IS_LOGGED_IN, 'true'],
    ]);
  }

  /**
   * Loads user profile from AsyncStorage
   */
  async loadUserProfile(): Promise<User | null> {
    try {
      const values = await AsyncStorage.multiGet([
        STORAGE_KEYS.PHONE_NUMBER,
        STORAGE_KEYS.FULL_NAME,
        STORAGE_KEYS.EMAIL,
        STORAGE_KEYS.USER_TYPE,
        STORAGE_KEYS.MONTHLY_INCOME,
        STORAGE_KEYS.RISK_TOLERANCE,
        STORAGE_KEYS.CREATED_AT,
      ]);

      const data: Record<string, string | null> = {};
      values.forEach(([key, value]) => {
        data[key] = value;
      });

      if (!data[STORAGE_KEYS.FULL_NAME]) {
        return null;
      }

      return {
        phoneNumber: data[STORAGE_KEYS.PHONE_NUMBER] || '',
        fullName: data[STORAGE_KEYS.FULL_NAME] || '',
        email: data[STORAGE_KEYS.EMAIL] || '',
        userType: (data[STORAGE_KEYS.USER_TYPE] as UserType) || UserType.STUDENT,
        monthlyIncome: parseFloat(data[STORAGE_KEYS.MONTHLY_INCOME] || '0'),
        riskTolerance: (data[STORAGE_KEYS.RISK_TOLERANCE] as RiskTolerance) || RiskTolerance.MODERATE,
        createdAt: parseInt(data[STORAGE_KEYS.CREATED_AT] || '0', 10),
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  /**
   * Clears all user data (logout)
   */
  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    this.currentOtp = '';
    this.currentPhoneNumber = '';
  }
}

export const authService = new AuthService();
