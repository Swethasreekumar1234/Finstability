package com.trishajanath.finstability.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.trishajanath.finstability.data.model.AuthNavigationEvent
import com.trishajanath.finstability.ui.screens.DashboardScreen
import com.trishajanath.finstability.ui.screens.OtpVerificationScreen
import com.trishajanath.finstability.ui.screens.PhoneLoginScreen
import com.trishajanath.finstability.ui.screens.ProfileSetupScreen
import com.trishajanath.finstability.ui.viewmodel.AuthViewModel

/**
 * Navigation routes for the authentication flow
 */
sealed class AuthRoute(val route: String) {
    object PhoneLogin : AuthRoute("phone_login")
    object OtpVerification : AuthRoute("otp_verification")
    object ProfileSetup : AuthRoute("profile_setup")
    object Dashboard : AuthRoute("dashboard")
}

/**
 * Main Navigation Host for the app
 * 
 * Handles navigation between:
 * - Phone Login Screen
 * - OTP Verification Screen
 * - Profile Setup Screen
 * - Dashboard Screen
 * 
 * @param viewModel The shared AuthViewModel for the auth flow
 * @param startDestination The initial screen to display
 */
@Composable
fun FinstabilityNavHost(
    viewModel: AuthViewModel,
    navController: NavHostController = rememberNavController(),
    startDestination: String = determineStartDestination(viewModel)
) {
    // Handle navigation events from ViewModel
    LaunchedEffect(Unit) {
        viewModel.navigationEvent.collect { event ->
            when (event) {
                is AuthNavigationEvent.NavigateToOtp -> {
                    navController.navigate(AuthRoute.OtpVerification.route)
                }
                is AuthNavigationEvent.NavigateToProfileSetup -> {
                    navController.navigate(AuthRoute.ProfileSetup.route) {
                        // Clear backstack - user shouldn't go back to OTP
                        popUpTo(AuthRoute.PhoneLogin.route) { inclusive = true }
                    }
                }
                is AuthNavigationEvent.NavigateToDashboard -> {
                    navController.navigate(AuthRoute.Dashboard.route) {
                        // Clear entire backstack - user is now logged in
                        popUpTo(0) { inclusive = true }
                    }
                }
                is AuthNavigationEvent.NavigateToLogin -> {
                    navController.navigate(AuthRoute.PhoneLogin.route) {
                        // Clear entire backstack on logout
                        popUpTo(0) { inclusive = true }
                    }
                }
            }
        }
    }
    
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Phone Login Screen
        composable(AuthRoute.PhoneLogin.route) {
            PhoneLoginScreen(viewModel = viewModel)
        }
        
        // OTP Verification Screen
        composable(AuthRoute.OtpVerification.route) {
            OtpVerificationScreen(
                viewModel = viewModel,
                onBackClick = { navController.popBackStack() }
            )
        }
        
        // Profile Setup Screen
        composable(AuthRoute.ProfileSetup.route) {
            ProfileSetupScreen(viewModel = viewModel)
        }
        
        // Dashboard Screen
        composable(AuthRoute.Dashboard.route) {
            DashboardScreen(viewModel = viewModel)
        }
    }
}

/**
 * Determines the initial screen based on user state
 * 
 * Logic:
 * - If logged in AND has profile → Dashboard
 * - If logged in BUT no profile → Profile Setup (incomplete registration)
 * - Otherwise → Phone Login
 */
private fun determineStartDestination(viewModel: AuthViewModel): String {
    return when {
        viewModel.isLoggedIn() && viewModel.hasUserProfile() -> AuthRoute.Dashboard.route
        viewModel.isLoggedIn() -> AuthRoute.ProfileSetup.route
        else -> AuthRoute.PhoneLogin.route
    }
}
