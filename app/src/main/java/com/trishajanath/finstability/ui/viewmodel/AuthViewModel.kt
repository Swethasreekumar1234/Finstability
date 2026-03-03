package com.trishajanath.finstability.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.trishajanath.finstability.data.model.*
import com.trishajanath.finstability.data.repository.AuthRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel for authentication flow
 * Handles phone login, OTP verification, and profile management
 */
class AuthViewModel(private val repository: AuthRepository) : ViewModel() {
    
    // ==================== Phone Login State ====================
    
    private val _phoneNumber = MutableStateFlow("")
    val phoneNumber: StateFlow<String> = _phoneNumber.asStateFlow()
    
    private val _phoneError = MutableStateFlow<String?>(null)
    val phoneError: StateFlow<String?> = _phoneError.asStateFlow()
    
    // ==================== OTP State ====================
    
    private val _otpState = MutableStateFlow<OtpState>(OtpState.Idle)
    val otpState: StateFlow<OtpState> = _otpState.asStateFlow()
    
    private val _enteredOtp = MutableStateFlow("")
    val enteredOtp: StateFlow<String> = _enteredOtp.asStateFlow()
    
    private val _otpError = MutableStateFlow<String?>(null)
    val otpError: StateFlow<String?> = _otpError.asStateFlow()
    
    // ==================== Profile Setup State ====================
    
    private val _fullName = MutableStateFlow("")
    val fullName: StateFlow<String> = _fullName.asStateFlow()
    
    private val _email = MutableStateFlow("")
    val email: StateFlow<String> = _email.asStateFlow()
    
    private val _selectedUserType = MutableStateFlow<UserType?>(null)
    val selectedUserType: StateFlow<UserType?> = _selectedUserType.asStateFlow()
    
    private val _monthlyIncome = MutableStateFlow("")
    val monthlyIncome: StateFlow<String> = _monthlyIncome.asStateFlow()
    
    private val _selectedRiskTolerance = MutableStateFlow<RiskTolerance?>(null)
    val selectedRiskTolerance: StateFlow<RiskTolerance?> = _selectedRiskTolerance.asStateFlow()
    
    private val _profileError = MutableStateFlow<String?>(null)
    val profileError: StateFlow<String?> = _profileError.asStateFlow()
    
    private val _profileSaveState = MutableStateFlow<UIState<Unit>>(UIState.Idle)
    val profileSaveState: StateFlow<UIState<Unit>> = _profileSaveState.asStateFlow()
    
    // ==================== User Data State ====================
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()
    
    // ==================== Navigation Events ====================
    
    private val _navigationEvent = MutableSharedFlow<AuthNavigationEvent>()
    val navigationEvent: SharedFlow<AuthNavigationEvent> = _navigationEvent.asSharedFlow()
    
    init {
        // Load user profile if exists
        loadUserProfile()
    }
    
    // ==================== Phone Login Functions ====================
    
    /**
     * Updates the phone number input
     */
    fun updatePhoneNumber(phone: String) {
        // Only allow digits, max 10
        val filtered = phone.filter { it.isDigit() }.take(10)
        _phoneNumber.value = filtered
        _phoneError.value = null
    }
    
    /**
     * Validates phone number and sends OTP
     */
    fun sendOtp() {
        val phone = _phoneNumber.value
        
        // Validate phone number
        if (phone.isBlank()) {
            _phoneError.value = "Phone number is required"
            return
        }
        
        if (!repository.isValidPhoneNumber(phone)) {
            _phoneError.value = "Please enter a valid 10-digit phone number"
            return
        }
        
        // Clear any previous errors
        _phoneError.value = null
        
        viewModelScope.launch {
            _otpState.value = OtpState.Sending
            
            // Simulate network delay
            delay(1000)
            
            // Generate OTP (will be logged for testing)
            val otp = repository.generateOtp(phone)
            _otpState.value = OtpState.Sent(otp)
            
            // Navigate to OTP screen
            _navigationEvent.emit(AuthNavigationEvent.NavigateToOtp)
        }
    }
    
    // ==================== OTP Functions ====================
    
    /**
     * Updates the entered OTP
     */
    fun updateEnteredOtp(otp: String) {
        // Only allow digits, max 6
        val filtered = otp.filter { it.isDigit() }.take(6)
        _enteredOtp.value = filtered
        _otpError.value = null
    }
    
    /**
     * Verifies the entered OTP
     */
    fun verifyOtp() {
        val otp = _enteredOtp.value
        
        // Validate OTP format
        if (otp.length != 6) {
            _otpError.value = "Please enter all 6 digits"
            return
        }
        
        viewModelScope.launch {
            _otpState.value = OtpState.Verifying
            
            // Simulate verification delay
            delay(500)
            
            if (repository.verifyOtp(otp)) {
                _otpState.value = OtpState.Verified
                
                // Set logged in state
                repository.setLoggedIn(repository.getCurrentPhoneNumber())
                
                // Check if profile exists
                if (repository.isUserProfileExists()) {
                    // Load existing profile and navigate to dashboard
                    loadUserProfile()
                    _navigationEvent.emit(AuthNavigationEvent.NavigateToDashboard)
                } else {
                    // Navigate to profile setup
                    _navigationEvent.emit(AuthNavigationEvent.NavigateToProfileSetup)
                }
            } else {
                _otpState.value = OtpState.Error("Invalid OTP. Please try again.")
                _otpError.value = "Invalid OTP. Please try again."
            }
        }
    }
    
    /**
     * Resends the OTP
     */
    fun resendOtp() {
        viewModelScope.launch {
            _otpState.value = OtpState.Sending
            _enteredOtp.value = ""
            _otpError.value = null
            
            delay(1000)
            
            val otp = repository.generateOtp(repository.getCurrentPhoneNumber())
            _otpState.value = OtpState.Sent(otp)
        }
    }
    
    // ==================== Profile Setup Functions ====================
    
    /**
     * Updates the full name input
     */
    fun updateFullName(name: String) {
        _fullName.value = name
        _profileError.value = null
    }
    
    /**
     * Updates the email input
     */
    fun updateEmail(email: String) {
        _email.value = email
        _profileError.value = null
    }
    
    /**
     * Updates the selected user type
     */
    fun updateUserType(userType: UserType) {
        _selectedUserType.value = userType
        _profileError.value = null
    }
    
    /**
     * Updates the monthly income input
     */
    fun updateMonthlyIncome(income: String) {
        // Only allow digits and decimal point
        val filtered = income.filter { it.isDigit() || it == '.' }
        _monthlyIncome.value = filtered
        _profileError.value = null
    }
    
    /**
     * Updates the selected risk tolerance
     */
    fun updateRiskTolerance(riskTolerance: RiskTolerance) {
        _selectedRiskTolerance.value = riskTolerance
        _profileError.value = null
    }
    
    /**
     * Validates and saves the user profile
     */
    fun saveProfile() {
        // Validate required fields
        if (_fullName.value.isBlank()) {
            _profileError.value = "Full name is required"
            return
        }
        
        if (_selectedUserType.value == null) {
            _profileError.value = "Please select a user type"
            return
        }
        
        if (_monthlyIncome.value.isBlank()) {
            _profileError.value = "Monthly income is required"
            return
        }
        
        val income = _monthlyIncome.value.toDoubleOrNull()
        if (income == null || income < 0) {
            _profileError.value = "Please enter a valid income amount"
            return
        }
        
        if (_selectedRiskTolerance.value == null) {
            _profileError.value = "Please select your risk tolerance"
            return
        }
        
        // Validate email format if provided
        if (_email.value.isNotBlank() && !android.util.Patterns.EMAIL_ADDRESS.matcher(_email.value).matches()) {
            _profileError.value = "Please enter a valid email address"
            return
        }
        
        viewModelScope.launch {
            _profileSaveState.value = UIState.Loading
            
            // Simulate save delay
            delay(500)
            
            try {
                val user = User(
                    phoneNumber = repository.getCurrentPhoneNumber(),
                    fullName = _fullName.value.trim(),
                    email = _email.value.trim(),
                    userType = _selectedUserType.value!!,
                    monthlyIncome = income,
                    riskTolerance = _selectedRiskTolerance.value!!,
                    createdAt = System.currentTimeMillis()
                )
                
                repository.saveUserProfile(user)
                _currentUser.value = user
                _profileSaveState.value = UIState.Success(Unit)
                
                // Navigate to dashboard
                _navigationEvent.emit(AuthNavigationEvent.NavigateToDashboard)
                
            } catch (e: Exception) {
                _profileSaveState.value = UIState.Error(e.message ?: "Failed to save profile")
                _profileError.value = e.message ?: "Failed to save profile"
            }
        }
    }
    
    // ==================== Dashboard Functions ====================
    
    /**
     * Loads user profile from repository
     */
    fun loadUserProfile() {
        _currentUser.value = repository.getUserProfile()
    }
    
    /**
     * Checks if user is logged in
     */
    fun isLoggedIn(): Boolean = repository.isLoggedIn()
    
    /**
     * Checks if user profile exists
     */
    fun hasUserProfile(): Boolean = repository.isUserProfileExists()
    
    /**
     * Logs out the user
     */
    fun logout() {
        repository.logout()
        
        // Clear all state
        _phoneNumber.value = ""
        _enteredOtp.value = ""
        _fullName.value = ""
        _email.value = ""
        _selectedUserType.value = null
        _monthlyIncome.value = ""
        _selectedRiskTolerance.value = null
        _currentUser.value = null
        _otpState.value = OtpState.Idle
        _profileSaveState.value = UIState.Idle
        
        viewModelScope.launch {
            _navigationEvent.emit(AuthNavigationEvent.NavigateToLogin)
        }
    }
    
    /**
     * Clears all user data (account deletion)
     */
    fun clearAllData() {
        repository.clearAllData()
        logout()
    }
}

/**
 * Factory for creating AuthViewModel with repository dependency
 */
class AuthViewModelFactory(private val repository: AuthRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            return AuthViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
