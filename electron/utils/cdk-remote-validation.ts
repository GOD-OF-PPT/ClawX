import { proxyAwareFetch } from './proxy-fetch';
import { normalizeCdk } from './cdk-validation';

const GIST_URL = 'https://gist.githubusercontent.com/GOD-OF-PPT/3fb44e57b7ef1e3f68863a3dbc54341c/raw/d22e4a9809bed200615e9430d0a9b8bf71f72e48/valid-cdk.json';
const FETCH_TIMEOUT_MS = 10000;

export interface RemoteValidationResult {
  valid: boolean;
  error?: string;
  networkError?: boolean;
}

interface GistResponse {
  validCdk?: string[];
}

export async function fetchValidCdkList(): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await proxyAwareFetch(GIST_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as GistResponse;
    return Array.isArray(data?.validCdk) ? data.validCdk : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function validateCdkRemotely(cdk: string): Promise<RemoteValidationResult> {
  try {
    console.log('[cdk-remote] Fetching valid CDK list from Gist...');
    const validList = await fetchValidCdkList();
    const normalizedInput = normalizeCdk(cdk);

    const found = validList.some(validCdk =>
      normalizeCdk(validCdk) === normalizedInput
    );

    if (!found) {
      console.log('[cdk-remote] CDK not found in valid list');
      return { valid: false, error: 'CDK not found in valid list. Please contact support.' };
    }

    console.log('[cdk-remote] CDK found in valid list');
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cdk-remote] Network error:', message);
    return {
      valid: false,
      error: `Network error: ${message}. Please check your internet connection.`,
      networkError: true
    };
  }
}