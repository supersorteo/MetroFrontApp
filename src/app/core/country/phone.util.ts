import { countryDisplayName } from './country.util';

export interface PhoneValidationResult {
  valid: boolean;
  message: string;
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^0-9+\s()-]/g, '');
}

export function phonePlaceholder(country: string | null | undefined): string {
  switch (countryDisplayName(country)) {
    case 'Argentina':
      return 'Ej: 11 2345-6789 o +54 9 11 2345-6789';
    case 'Uruguay':
      return 'Ej: 091 234 567 o +598 91 234 567';
    case 'Colombia':
      return 'Ej: 300 123 4567 o +57 300 123 4567';
    default:
      return 'Telefono';
  }
}

export function validatePhoneByCountry(rawPhone: string, country: string | null | undefined): PhoneValidationResult {
  const displayCountry = countryDisplayName(country);
  const phone = rawPhone.trim();

  if (!displayCountry) {
    return { valid: false, message: 'Selecciona un pais antes de cargar el telefono.' };
  }

  if (!phone) {
    return { valid: false, message: 'El telefono es obligatorio.' };
  }

  let digits = phone.replace(/\D/g, '');

  switch (displayCountry) {
    case 'Argentina':
      if (digits.startsWith('54')) {
        digits = digits.slice(2);
      }
      if (digits.startsWith('9') && digits.length >= 11) {
        digits = digits.slice(1);
      }
      if (digits.startsWith('0') && digits.length >= 11) {
        digits = digits.slice(1);
      }
      return digits.length >= 10 && digits.length <= 11
        ? { valid: true, message: '' }
        : { valid: false, message: 'El telefono de Argentina debe tener entre 10 y 11 digitos validos.' };

    case 'Uruguay':
      if (digits.startsWith('598')) {
        digits = digits.slice(3);
      }
      if (digits.startsWith('0') && digits.length === 9) {
        digits = digits.slice(1);
      }
      return digits.length === 8
        ? { valid: true, message: '' }
        : { valid: false, message: 'El telefono de Uruguay debe tener 8 digitos validos.' };

    case 'Colombia':
      if (digits.startsWith('57')) {
        digits = digits.slice(2);
      }
      return digits.length === 10
        ? { valid: true, message: '' }
        : { valid: false, message: 'El telefono de Colombia debe tener 10 digitos validos.' };

    default:
      return digits.length >= 8 && digits.length <= 15
        ? { valid: true, message: '' }
        : { valid: false, message: 'El telefono no tiene un formato valido.' };
  }
}
