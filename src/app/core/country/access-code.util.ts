import { countryDisplayName } from './country.util';

export function normalizeAccessCodeInput(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase();
}

export function accessCodeCountryMismatchMessage(
  detectedCountry: string | null | undefined,
  selectedCountry: string | null | undefined
): string {
  const normalizedDetectedCountry = countryDisplayName(detectedCountry);
  const normalizedSelectedCountry = countryDisplayName(selectedCountry);

  if (!normalizedDetectedCountry || !normalizedSelectedCountry) {
    return '';
  }

  return normalizedDetectedCountry === normalizedSelectedCountry
    ? ''
    : `El codigo ingresado pertenece a ${normalizedDetectedCountry}.`;
}
