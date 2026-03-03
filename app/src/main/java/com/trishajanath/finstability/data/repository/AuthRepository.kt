package com.trishajanath.finstability.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.trishajanath.finstability.data.model.RiskTolerance
import com.trishajanath.finstability.data.model.User
import com.trishajanath.finstability.data.model.UserType
import kotlin.random.Random

/**
 * Repository handling authentication operations including:
 * - Local OTP generation and verification (simulated)
 * - User data persistence using SharedPreferences
 * - Session management
 */
class AuthRepository(context: Context) {
    
    companion object {
        private const val TAG = "AuthRepository"
        private const val PREFS_NAME = "finstability_user_prefs"
        
        // SharedPreferences keys
        private const val KEY_PHONE_NUMBER = "phone_number"
        private const val KEY_FULL_NAME = "full_name"
        private const val KEY_EMAIL = "email"
        private const val KEY_USER_TYPE = "user_type"
        private const val KEY_MONTHLY_INCOME = "monthly_income"
        private const val KEY_RISK_TOLERANCE = "risk_tolerance"
        private const val KEY_CREATED_AT = "created_at"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
    }
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    // Stores the currently generated OTP for verification
    private var currentOtp: String = ""
    private var currentPhoneNumber: String = ""
    
    /**
     * Generates a random 6-digit OTP and logs it for testing
     * In production, this would integrate with SMS gateway
     * 
     * @param phoneNumber The phone number to send OTP to
     * @return The generated OTP string
     */
    fun generateOtp(phoneNumber: String): String {
        // Generate random 6-digit OTP
        currentOtp = String.format("%06d", Random.nextInt(0, 999999))
        currentPhoneNumber = phoneNumber
        
        // Log OTP for testing purposes
        Log.d(TAG, "========================================")
        Log.d(TAG, "OTP GENERATED FOR TESTING")
        Log.d(TAG, "Phone: $phoneNumber")
        Log.d(TAG, "OTP: $currentOtp")
        Log.d(TAG, "========================================")
        
        return currentOtp
    }
    
    /**
     * Verifies the entered OTP against the generated OTP
     * 
     * @param enteredOtp The OTP entered by user
     * @return True if OTP matches, false otherwise
     */
    fun verifyOtp(enteredOtp: String): Boolean {
        val isValid = enteredOtp == currentOtp && currentOtp.isNotEmpty()
        
        if (isValid) {
            Log.d(TAG, "OTP verified successfully for phone: $currentPhoneNumber")
        } else {
            Log.d(TAG, "OTP verification failed. Entered: $enteredOtp, Expected: $currentOtp")
        }
        
        return isValid
    }
    
    /**
     * Gets the current phone number being authenticated
     */
    fun getCurrentPhoneNumber(): String = currentPhoneNumber
    
    /**
     * Checks if a user profile exists in SharedPreferences
     * 
     * @return True if user profile exists, false otherwise
     */
    fun isUserProfileExists(): Boolean {
        return sharedPreferences.contains(KEY_FULL_NAME) && 
               sharedPreferences.getString(KEY_FULL_NAME, "")?.isNotEmpty() == true
    }
    
    /**
     * Checks if user is currently logged in
     * 
     * @return True if logged in, false otherwise
     */
    fun isLoggedIn(): Boolean {
        return sharedPreferences.getBoolean(KEY_IS_LOGGED_IN, false)
    }
    
    /**
     * Saves user profile to SharedPreferences
     * 
     * @param user The user profile to save
     */
    fun saveUserProfile(user: User) {
        sharedPreferences.edit().apply {
            putString(KEY_PHONE_NUMBER, user.phoneNumber)
            putString(KEY_FULL_NAME, user.fullName)
            putString(KEY_EMAIL, user.email)
            putString(KEY_USER_TYPE, user.userType.name)
            putFloat(KEY_MONTHLY_INCOME, user.monthlyIncome.toFloat())
            putString(KEY_RISK_TOLERANCE, user.riskTolerance.name)
            putLong(KEY_CREATED_AT, user.createdAt)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
        
        Log.d(TAG, "User profile saved: ${user.fullName}")
    }
    
    /**
     * Sets the logged-in state after successful OTP verification
     */
    fun setLoggedIn(phoneNumber: String) {
        sharedPreferences.edit().apply {
            putString(KEY_PHONE_NUMBER, phoneNumber)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }
    
    /**
     * Retrieves user profile from SharedPreferences
     * 
     * @return User object if exists, null otherwise
     */
    fun getUserProfile(): User? {
        val phoneNumber = sharedPreferences.getString(KEY_PHONE_NUMBER, null) ?: return null
        val fullName = sharedPreferences.getString(KEY_FULL_NAME, null) ?: return null
        val email = sharedPreferences.getString(KEY_EMAIL, "") ?: ""
        val userTypeStr = sharedPreferences.getString(KEY_USER_TYPE, null) ?: return null
        val monthlyIncome = sharedPreferences.getFloat(KEY_MONTHLY_INCOME, 0f).toDouble()
        val riskToleranceStr = sharedPreferences.getString(KEY_RISK_TOLERANCE, null) ?: return null
        val createdAt = sharedPreferences.getLong(KEY_CREATED_AT, System.currentTimeMillis())
        
        return try {
            User(
                phoneNumber = phoneNumber,
                fullName = fullName,
                email = email,
                userType = UserType.valueOf(userTypeStr),
                monthlyIncome = monthlyIncome,
                riskTolerance = RiskTolerance.valueOf(riskToleranceStr),
                createdAt = createdAt
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing user profile: ${e.message}")
            null
        }
    }
    
    /**
     * Clears user session (logout)
     * Only clears the login state, preserves user profile data
     */
    fun logout() {
        sharedPreferences.edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, false)
            apply()
        }
        
        // Clear current OTP
        currentOtp = ""
        currentPhoneNumber = ""
        
        Log.d(TAG, "User logged out")
    }
    
    /**
     * Completely clears all user data (for account deletion)
     */
    fun clearAllData() {
        sharedPreferences.edit().clear().apply()
        currentOtp = ""
        currentPhoneNumber = ""
        
        Log.d(TAG, "All user data cleared")
    }
    
    /**
     * Validates phone number format
     * 
     * @param phoneNumber The phone number to validate
     * @return True if valid 10-digit number, false otherwise
     */
    fun isValidPhoneNumber(phoneNumber: String): Boolean {
        // Remove any spaces or special characters
        val cleanNumber = phoneNumber.replace(Regex("[^0-9]"), "")
        return cleanNumber.length == 10
    }
}
