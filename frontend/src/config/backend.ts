import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '8000';

const normalizeBaseUrl = (url: string): string => url.replace(/\/$/, '');

const buildLocalUrl = (host: string): string => `http://${host}:${DEFAULT_BACKEND_PORT}`;

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
    return normalizeBaseUrl(explicitUrl);
  }

  const host = getHostFromExpo();
  if (host) {
    return buildLocalUrl(host);
  }

  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : `http://localhost:${DEFAULT_BACKEND_PORT}`;
};

export const getBackendBaseUrls = (): string[] => {
  const urls = new Set<string>();

  const explicitUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (explicitUrl) {
    urls.add(normalizeBaseUrl(explicitUrl));
  }

  const host = getHostFromExpo();
  if (host) {
    urls.add(buildLocalUrl(host));
  }

  if (Platform.OS === 'android') {
    urls.add('http://10.0.2.2:8000');
  }

  urls.add(`http://localhost:${DEFAULT_BACKEND_PORT}`);
  return [...urls];
};
