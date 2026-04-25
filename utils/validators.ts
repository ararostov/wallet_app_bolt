// Field-level validators used across forms.
// Keep pure and synchronous.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{1,14}$/;
// UK postcode: GIR 0AA or standard formats. Loose but practical.
const UK_POSTCODE_RE =
  /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

export function isValidEmail(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

export function isValidE164(value: string): boolean {
  if (typeof value !== 'string') return false;
  return E164_RE.test(value.trim());
}

export function isValidUkPhone(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!E164_RE.test(trimmed)) return false;
  return trimmed.startsWith('+44');
}

export function isValidDob18plus(iso: string): boolean {
  if (typeof iso !== 'string' || iso.length === 0) return false;
  // Accept YYYY-MM-DD or full ISO 8601 timestamp.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  const dayDiff = now.getDate() - d.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 18 && age <= 130;
}

export function isValidUkPostcode(value: string): boolean {
  if (typeof value !== 'string') return false;
  return UK_POSTCODE_RE.test(value.trim());
}

export function isStrongPassword(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  return hasLetter && hasDigit;
}
