package com.trishajanath.finstability.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.trishajanath.finstability.data.model.RiskTolerance
import com.trishajanath.finstability.data.model.UIState
import com.trishajanath.finstability.data.model.UserType
import com.trishajanath.finstability.ui.viewmodel.AuthViewModel

/**
 * Profile Setup Screen
 * 
 * Collects user profile information after successful OTP verification.
 * First-time users must complete this before accessing the dashboard.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSetupScreen(
    viewModel: AuthViewModel
) {
    val fullName by viewModel.fullName.collectAsState()
    val email by viewModel.email.collectAsState()
    val selectedUserType by viewModel.selectedUserType.collectAsState()
    val monthlyIncome by viewModel.monthlyIncome.collectAsState()
    val selectedRiskTolerance by viewModel.selectedRiskTolerance.collectAsState()
    val profileError by viewModel.profileError.collectAsState()
    val profileSaveState by viewModel.profileSaveState.collectAsState()
    
    val isLoading = profileSaveState is UIState.Loading
    val scrollState = rememberScrollState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Complete Your Profile") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp)
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = "Profile",
                    modifier = Modifier.size(40.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Personal Information",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Help us personalize your experience",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Error message
            if (profileError != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = profileError!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
            
            // Full Name (Required)
            OutlinedTextField(
                value = fullName,
                onValueChange = { viewModel.updateFullName(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Full Name *") },
                placeholder = { Text("Enter your full name") },
                singleLine = true,
                enabled = !isLoading,
                keyboardOptions = KeyboardOptions(
                    imeAction = ImeAction.Next
                )
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Email (Optional)
            OutlinedTextField(
                value = email,
                onValueChange = { viewModel.updateEmail(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email (Optional)") },
                placeholder = { Text("Enter your email") },
                singleLine = true,
                enabled = !isLoading,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                )
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // User Type Selection
            Text(
                text = "I am a... *",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Column(modifier = Modifier.selectableGroup()) {
                UserType.entries.forEach { userType ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = selectedUserType == userType,
                                onClick = { viewModel.updateUserType(userType) },
                                role = Role.RadioButton,
                                enabled = !isLoading
                            )
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedUserType == userType,
                            onClick = null,
                            enabled = !isLoading
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = userType.displayName,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Monthly Income
            OutlinedTextField(
                value = monthlyIncome,
                onValueChange = { viewModel.updateMonthlyIncome(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Monthly Income *") },
                placeholder = { Text("Enter amount") },
                leadingIcon = {
                    Text(
                        text = "₹",
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.padding(start = 12.dp)
                    )
                },
                singleLine = true,
                enabled = !isLoading,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Done
                )
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Risk Tolerance Selection
            Text(
                text = "Investment Risk Tolerance *",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Text(
                text = "How comfortable are you with investment risks?",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Column(modifier = Modifier.selectableGroup()) {
                RiskTolerance.entries.forEach { risk ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = selectedRiskTolerance == risk,
                                onClick = { viewModel.updateRiskTolerance(risk) },
                                role = Role.RadioButton,
                                enabled = !isLoading
                            )
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedRiskTolerance == risk,
                            onClick = null,
                            enabled = !isLoading
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = risk.displayName,
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = when (risk) {
                                    RiskTolerance.LOW -> "Prefer stable, low-risk investments"
                                    RiskTolerance.MEDIUM -> "Balance between growth and stability"
                                    RiskTolerance.HIGH -> "Willing to accept volatility for higher returns"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Save Profile Button
            Button(
                onClick = { viewModel.saveProfile() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Saving...")
                } else {
                    Text(
                        text = "Complete Setup",
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
