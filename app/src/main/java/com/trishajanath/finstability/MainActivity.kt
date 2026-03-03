package com.trishajanath.finstability

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import com.trishajanath.finstability.data.repository.AuthRepository
import com.trishajanath.finstability.ui.navigation.FinstabilityNavHost
import com.trishajanath.finstability.ui.theme.FinstabilityTheme
import com.trishajanath.finstability.ui.viewmodel.AuthViewModel
import com.trishajanath.finstability.ui.viewmodel.AuthViewModelFactory

/**
 * Main Activity - Entry point for the Finstability app
 * 
 * Sets up:
 * - AuthRepository with application context
 * - AuthViewModel with factory pattern
 * - Navigation host for screen routing
 */
class MainActivity : ComponentActivity() {
    
    private lateinit var authViewModel: AuthViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        // Initialize repository with application context
        val repository = AuthRepository(applicationContext)
        
        // Create ViewModel using factory pattern
        val factory = AuthViewModelFactory(repository)
        authViewModel = ViewModelProvider(this, factory)[AuthViewModel::class.java]
        
        setContent {
            FinstabilityTheme {
                // Main navigation host handles all screen routing
                FinstabilityNavHost(viewModel = authViewModel)
            }
        }
    }
}