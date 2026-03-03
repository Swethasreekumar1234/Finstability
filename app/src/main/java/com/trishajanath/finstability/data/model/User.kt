package com.trishajanath.finstability.data.model

/**
 * User data class representing the user profile
 * Stored in SharedPreferences as individual fields
 */
data class User(
    val phoneNumber: String,
    val fullName: String,
    val email: String = "",
    val userType: UserType,
    val monthlyIncome: Double,
    val riskTolerance: RiskTolerance,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Enum representing different user types for the finance app
 */
enum class UserType(val displayName: String) {
    STUDENT("Student"),
    RETIREE("Retiree"),
    SMALL_BUSINESS("Small Business Owner")
}

/**
 * Enum representing risk tolerance levels for investment recommendations
 */
enum class RiskTolerance(val displayName: String) {
    LOW("Low - Conservative"),
    MEDIUM("Medium - Balanced"),
    HIGH("High - Aggressive")
}
