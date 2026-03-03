package com.trishajanath.finstability.data.model

/**
 * Sealed class representing different UI states for async operations
 * Used throughout the app for consistent state management
 */
sealed class UIState<out T> {
    /**
     * Initial idle state - no operation in progress
     */
    object Idle : UIState<Nothing>()
    
    /**
     * Loading state - operation in progress
     */
    object Loading : UIState<Nothing>()
    
    /**
     * Success state with data
     * @param data The result data from successful operation
     */
    data class Success<T>(val data: T) : UIState<T>()
    
    /**
     * Error state with error message
     * @param message The error message to display
     */
    data class Error(val message: String) : UIState<Nothing>()
}

/**
 * Specific state for OTP operations
 */
sealed class OtpState {
    object Idle : OtpState()
    object Sending : OtpState()
    data class Sent(val otp: String) : OtpState()
    object Verifying : OtpState()
    object Verified : OtpState()
    data class Error(val message: String) : OtpState()
}

/**
 * Navigation events for the auth flow
 */
sealed class AuthNavigationEvent {
    object NavigateToOtp : AuthNavigationEvent()
    object NavigateToProfileSetup : AuthNavigationEvent()
    object NavigateToDashboard : AuthNavigationEvent()
    object NavigateToLogin : AuthNavigationEvent()
}
