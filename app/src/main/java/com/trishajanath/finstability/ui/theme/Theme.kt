package com.trishajanath.finstability.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Dark color scheme for Finstability
 * Used when system is in dark mode
 */
private val DarkColorScheme = darkColorScheme(
    primary = FinGreen80,
    onPrimary = Color(0xFF003731),
    primaryContainer = Color(0xFF005048),
    onPrimaryContainer = FinGreen80,
    secondary = FinSecondary80,
    onSecondary = Color(0xFF253238),
    secondaryContainer = Color(0xFF3B4A51),
    onSecondaryContainer = FinSecondary80,
    tertiary = FinAccent80,
    background = Color(0xFF191C1C),
    onBackground = Color(0xFFE0E3E2),
    surface = Color(0xFF191C1C),
    onSurface = Color(0xFFE0E3E2),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005)
)

/**
 * Light color scheme for Finstability
 * Professional finance app theme with teal/green accents
 */
private val LightColorScheme = lightColorScheme(
    primary = FinGreen,
    onPrimary = FinOnPrimary,
    primaryContainer = Color(0xFFB2DFDB),
    onPrimaryContainer = Color(0xFF002020),
    secondary = FinSecondary,
    onSecondary = FinOnSecondary,
    secondaryContainer = Color(0xFFCFD8DC),
    onSecondaryContainer = Color(0xFF111D22),
    tertiary = FinAccent,
    background = FinBackground,
    onBackground = FinOnBackground,
    surface = FinSurface,
    onSurface = FinOnSurface,
    surfaceVariant = Color(0xFFDAE5E3),
    onSurfaceVariant = Color(0xFF3F4947),
    error = FinError,
    onError = FinOnPrimary
)

/**
 * Main theme composable for Finstability app
 * 
 * Features:
 * - Supports light/dark mode
 * - Uses Material 3 design system
 * - Finance-appropriate color palette
 * - Edge-to-edge support with proper status bar colors
 */
@Composable
fun FinstabilityTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    // Set to false to use our custom finance theme
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    // Update status bar color
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}