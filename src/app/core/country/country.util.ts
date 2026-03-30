export type CountryCode = 'AR' | 'UY' | 'CO';

export function normalizeCountryCode(value: string | null | undefined): CountryCode | null {
  if (!value) {
    return null;
  }

  switch (value.trim().toLowerCase()) {
    case 'ar':
    case 'argentina':
      return 'AR';
    case 'uy':
    case 'uruguay':
      return 'UY';
    case 'co':
    case 'colombia':
      return 'CO';
    default:
      return null;
  }
}

export function countryDisplayName(value: string | null | undefined): string | null {
  const code = normalizeCountryCode(value);
  if (!code) {
    return value?.trim() || null;
  }

  switch (code) {
    case 'AR':
      return 'Argentina';
    case 'UY':
      return 'Uruguay';
    case 'CO':
      return 'Colombia';
  }
}

export function countryAdminKey(value: string | null | undefined): 'argentina' | 'uruguay' | 'colombia' | null {
  const code = normalizeCountryCode(value);
  if (!code) {
    return null;
  }

  switch (code) {
    case 'AR':
      return 'argentina';
    case 'UY':
      return 'uruguay';
    case 'CO':
      return 'colombia';
  }
}
