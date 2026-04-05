import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '8000';

const normalizeBaseUrl = (url: string): string => url.replace(/\/$/, '');

const buildLocalUrl = (host: string): string => `http://${host}:${DEFAULT_BACKEND_PORT}`;

const parseHost = (raw?: string | null): string | null => {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;

  if (normalized.includes('://')) {
    try {
      const parsed = new URL(normalized);
      return parsed.hostname || null;
    } catch {
      // Fall through to non-URL parsing.
    }
  }

  const withoutPath = normalized.split('/')[0];
  const host = withoutPath.split(':')[0]?.trim();
  return host || null;
};

const getHostFromExpo = (): string | null => {
  const anyConstants = Constants as any;

  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.hostUri,
    anyConstants?.manifest?.debuggerHost,
    anyConstants?.manifest2?.extra?.expoClient?.hostUri,
    anyConstants?.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const host = parseHost(candidate);
    if (host) {
      return host;
    }
  }

  return null;
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
