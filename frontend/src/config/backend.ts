import Constants from 'expo-constants';

const DEFAULT_BACKEND_PORT = '8000';

const getHostFromExpo = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.hostUri;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0]?.trim();
  return host || null;
};

export const getBackendBaseUrl = (): string => {
  const explicitUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  const host = getHostFromExpo();
  if (host) {
    return `http://${host}:${DEFAULT_BACKEND_PORT}`;
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
};
