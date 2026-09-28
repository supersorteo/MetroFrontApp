export const TERMS_VERSION = '2026-09-23-v1';

export function termsStorageKey(userCode: string): string {
  return `metro.terms.accepted.${TERMS_VERSION}.${userCode.trim().toUpperCase()}`;
}

export function hasAcceptedTerms(userCode: string): boolean {
  return !!userCode.trim() && localStorage.getItem(termsStorageKey(userCode)) === TERMS_VERSION;
}
