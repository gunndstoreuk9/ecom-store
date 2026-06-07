/**
 * Morocco phone number utilities
 * Valid mobile prefixes: 06, 07
 * E.164 format: +2126XXXXXXXX or +2127XXXXXXXX
 */

const FAKE_PATTERNS = [
  /^0600000000$/,
  /^0611111111$/,
  /^0622222222$/,
  /^0633333333$/,
  /^0644444444$/,
  /^0655555555$/,
  /^0666666666$/,
  /^0677777777$/,
  /^0688888888$/,
  /^0699999999$/,
  /^0700000000$/,
  /^0711111111$/,
];

export function normalizeMoroccoPhone(input: string): string {
  const digits = input.replace(/[\s\-().+]/g, "");

  if (digits.startsWith("00212")) return "+" + digits.slice(2);
  if (digits.startsWith("212") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) {
    return "+212" + digits.slice(1);
  }
  return input;
}

export function isValidMoroccoMobile(input: string): boolean {
  const normalized = normalizeMoroccoPhone(input);
  if (!/^\+2126\d{8}$|^\+2127\d{8}$/.test(normalized)) return false;
  const local = "0" + normalized.slice(4);
  return !FAKE_PATTERNS.some((p) => p.test(local));
}

export function toLocalMoroccoPhone(input: string): string {
  const normalized = normalizeMoroccoPhone(input);
  if (normalized.startsWith("+212") && normalized.length === 13) {
    return "0" + normalized.slice(4);
  }
  return input;
}

export function toE164MoroccoPhone(input: string): string {
  return normalizeMoroccoPhone(input);
}
