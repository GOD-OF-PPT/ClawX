const LEGACY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DATE_EPOCH_YEAR = 2020;

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = 62;

function base32Decode(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = LEGACY_ALPHABET.indexOf(str[i].toUpperCase());
    if (idx === -1) return -1;
    result = result * 32 + idx;
  }
  return result;
}

function base62Decode(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = ALPHABET.indexOf(str[i]);
    if (idx === -1) return -1;
    result = result * BASE + idx;
  }
  return result;
}



export interface CdkValidationResult {
  valid: boolean;
  error?: string;
  expired?: boolean;
  expirationDate?: string;
}

export interface CdkDecodeResult extends CdkValidationResult {
  apiKey?: string;
}

/**
 * Validate legacy 4-segment CDK format
 * Format: XXXX-XXXX-XXXX-XXXX
 */
function validateLegacyCdk(cdk: string): CdkValidationResult {
  const trimmed = cdk.trim().toUpperCase();
  const parts = trimmed.split('-');

  if (parts.length !== 4) {
    return { valid: false, error: 'Invalid CDK format. Expected: XXXX-XXXX-XXXX-XXXX' };
  }

  const [datePart, _checksumPart, random1Part, random2Part] = parts;

  for (const part of parts) {
    if (part.length !== 4) {
      return { valid: false, error: 'Invalid CDK format. Expected: XXXX-XXXX-XXXX-XXXX' };
    }
    for (const char of part) {
      if (!LEGACY_ALPHABET.includes(char)) {
        return { valid: false, error: 'Invalid CDK format. Contains invalid characters.' };
      }
    }
  }

  if (random1Part !== random2Part) {
    return { valid: false, error: 'Invalid CDK checksum.' };
  }

  const dateNum = base32Decode(datePart);
  const MAX_DATE_VALUE = 1048576; // 32^4
  if (dateNum < 0 || dateNum >= MAX_DATE_VALUE) {
    return { valid: false, error: 'Invalid CDK format.' };
  }

  const fullDateNum = dateNum + DATE_EPOCH_YEAR * 10000;
  const year = Math.floor(fullDateNum / 10000);
  const month = Math.floor((fullDateNum % 10000) / 100);
  const day = fullDateNum % 100;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, error: 'Invalid CDK date.' };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return { valid: false, error: 'Invalid CDK date.' };
  }

  const expirationDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expDate = new Date(year, month - 1, day);

  if (now > expDate) {
    return { valid: false, error: `CDK expired on ${expirationDate}`, expired: true, expirationDate };
  }

  return { valid: true, expirationDate };
}

/**
 * Decode date part to expiration date string
 */
function decodeDatePart(datePart: string): { valid: boolean; expirationDate?: string; error?: string } {
  if (datePart.length !== 4) {
    return { valid: false, error: 'Invalid date part length' };
  }

  const dateNum = base62Decode(datePart);
  if (dateNum < 0) {
    return { valid: false, error: 'Invalid date part characters' };
  }

  // Max value for 4-char base62 is 62^4 = 14,776,336
  const maxDateValue = Math.pow(BASE, 4);
  if (dateNum >= maxDateValue) {
    return { valid: false, error: 'Invalid date part value' };
  }

  const fullDateNum = dateNum + DATE_EPOCH_YEAR * 10000;
  const year = Math.floor(fullDateNum / 10000);
  const month = Math.floor((fullDateNum % 10000) / 100);
  const day = fullDateNum % 100;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, error: 'Invalid date values' };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return { valid: false, error: 'Invalid day for month' };
  }

  const expirationDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, expirationDate };
}

/**
 * Validate 6-segment CDK format and extract components
 * Format: datePart-seedPart1-seedPart2-seedPart3-seedPart4-checksumPart
 * 
 * Note: The API Key segments are generated via one-way hash, so the original
 * API Key cannot be recovered. We return the CDK itself as the apiKey field.
 */
function validateAndDecode6SegmentCdk(cdk: string): CdkDecodeResult {
  const trimmed = cdk.trim();
  const parts = trimmed.split('-');

  if (parts.length !== 6) {
    return { valid: false, error: 'Invalid CDK format. Expected 6 segments: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX' };
  }

  const [datePart, seedPart1, seedPart2, seedPart3, seedPart4, checksumPart] = parts;

  const allParts = [datePart, seedPart1, seedPart2, seedPart3, seedPart4, checksumPart];
  for (const part of allParts) {
    if (part.length !== 4) {
      return { valid: false, error: 'Invalid CDK format. Each segment must be 4 characters.' };
    }
    for (const char of part) {
      if (!ALPHABET.includes(char)) {
        return { valid: false, error: 'Invalid CDK format. Contains invalid characters.' };
      }
    }
  }

  const dateResult = decodeDatePart(datePart);
  if (!dateResult.valid) {
    return { valid: false, error: dateResult.error };
  }

  const expirationDate = dateResult.expirationDate!;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [year, month, day] = expirationDate.split('-').map(Number);
  const expDate = new Date(year, month - 1, day);

  if (now > expDate) {
    return {
      valid: false,
      error: `CDK expired on ${expirationDate}`,
      expired: true,
      expirationDate,
    };
  }

  // The API Key segments are one-way hashed, so we cannot recover the original API Key.
  // Return the CDK itself as the apiKey for reference.
  // The seedParts contain the hashed API Key but cannot be reversed.
  return {
    valid: true,
    expirationDate,
    apiKey: trimmed,
  };
}

/**
 * Validate CDK format (supports both 4-segment legacy and 6-segment new format)
 */
export function validateCdkFormat(cdk: string): CdkValidationResult {
  if (!cdk || typeof cdk !== 'string') {
    return { valid: false, error: 'CDK is required' };
  }

  const trimmed = cdk.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'CDK is required' };
  }

  const parts = trimmed.split('-');

  // Route to appropriate validator based on segment count
  if (parts.length === 4) {
    return validateLegacyCdk(cdk);
  } else if (parts.length === 6) {
    return validateAndDecode6SegmentCdk(cdk);
  }

  return {
    valid: false,
    error: 'Invalid CDK format. Expected 4 or 6 segments.',
  };
}

/**
 * Decode 6-segment CDK and extract components
 * Returns expiration date and apiKey (CDK itself since hash is one-way)
 * 
 * For 4-segment legacy CDK, falls back to validateCdkFormat behavior.
 */
export function decodeCdk(cdk: string): CdkDecodeResult {
  if (!cdk || typeof cdk !== 'string') {
    return { valid: false, error: 'CDK is required' };
  }

  const trimmed = cdk.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'CDK is required' };
  }

  const parts = trimmed.split('-');

  if (parts.length === 6) {
    return validateAndDecode6SegmentCdk(cdk);
  }

  if (parts.length === 4) {
    const result = validateLegacyCdk(cdk);
    // For legacy CDK, return the CDK as apiKey for backward compatibility
    return {
      ...result,
      apiKey: result.valid ? trimmed : undefined,
    };
  }

  return {
    valid: false,
    error: 'Invalid CDK format. Expected 4 or 6 segments.',
  };
}

/**
 * Normalize CDK string (trim and preserve case for 6-segment, uppercase for legacy)
 */
export function normalizeCdk(cdk: string): string {
  const trimmed = cdk.trim();
  const parts = trimmed.split('-');

  // For 6-segment CDK, preserve case (base62 is case-sensitive)
  if (parts.length === 6) {
    return trimmed;
  }

  // For legacy 4-segment CDK, uppercase
  return trimmed.toUpperCase();
}