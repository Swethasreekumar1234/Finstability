# Finstability - React Native with Expo

A personal finance app built with React Native and Expo.

## Features

- 📱 **Phone Login with OTP** - Simple phone number authentication with OTP verification
- 👤 **Profile Setup** - Collect user information (name, email, user type, income, risk tolerance)
- 📊 **Dashboard** - View profile information and financial summary
- 💾 **Persistent Storage** - User data stored locally with AsyncStorage

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Zustand** for state management
- **React Navigation** for routing
- **AsyncStorage** for local data persistence

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- Expo Go app on your phone (for testing)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running the App

After starting the dev server:

1. **iOS Simulator**: Press `i` in the terminal
2. **Android Emulator**: Press `a` in the terminal
3. **Physical Device**: Scan the QR code with Expo Go app

## Project Structure

```
├── App.tsx                     # Main app entry point
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx    # Navigation configuration
│   ├── screens/
│   │   ├── PhoneLoginScreen.tsx
│   │   ├── OtpVerificationScreen.tsx
│   │   ├── ProfileSetupScreen.tsx
│   │   └── DashboardScreen.tsx
│   ├── services/
│   │   └── authService.ts      # Auth logic & storage
│   ├── store/
│   │   └── authStore.ts        # Zustand state management
│   ├── theme/
│   │   └── colors.ts           # App color palette
│   └── types/
│       └── index.ts            # TypeScript definitions
├── assets/                     # App icons and images
├── app.json                    # Expo configuration
├── package.json
└── tsconfig.json
```

## OTP Testing

During development, the OTP is logged to the console. When you send an OTP:
1. Check your terminal/console output
2. Look for "OTP GENERATED FOR TESTING"
3. Use the displayed 6-digit code

## Building for Production

```bash
# Build for Android
npx expo build:android

# Build for iOS
npx expo build:ios

# Or use EAS Build (recommended)
npx eas build --platform android
npx eas build --platform ios
```

## Future Enhancements

- [ ] Firebase Authentication (real SMS OTP)
- [ ] Firestore for cloud storage
- [ ] Financial tracking features
- [ ] Budgeting tools
- [ ] Investment insights