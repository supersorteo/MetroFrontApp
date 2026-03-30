import { MembershipCatalogCountry } from '../../servicios/membership-payment.service';
import { validatePhoneByCountry } from '../country/phone.util';

export interface MembershipCountryOption {
  nombre: string;
  codigo: string;
  flag: string;
  currency: string;
  documentLabel: string;
  plans: { months: number; amount: number }[];
}

export interface MembershipCheckoutForm {
  countryCode: string | null;
  planMonths: number | null;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  payerDocument: string;
  province: string;
}

interface CountryVisualOption {
  codigo: string;
  flag: string;
}

export interface MembershipCheckoutValidation {
  valid: boolean;
  phoneMessage: string;
}

export function mapMembershipCountryOption(
  countryCode: string,
  country: MembershipCatalogCountry,
  countries: CountryVisualOption[]
): MembershipCountryOption {
  const current = countries.find(item => item.codigo === countryCode);
  return {
    nombre: country.displayName,
    codigo: countryCode,
    flag: current?.flag || '',
    currency: country.currency,
    documentLabel: country.documentLabel,
    plans: Object.entries(country.plans)
      .map(([months, amount]) => ({ months: Number(months), amount }))
      .sort((left, right) => left.months - right.months)
  };
}

export function validateMembershipCheckoutForm(
  form: MembershipCheckoutForm,
  selectedCountryName: string | null | undefined
): MembershipCheckoutValidation {
  const phoneEmpty = !form.payerPhone.trim();
  const phoneValidation = validatePhoneByCountry(form.payerPhone, selectedCountryName || null);
  const phoneOk = phoneEmpty || phoneValidation.valid;
  const documentRequired = form.countryCode === 'AR';

  return {
    valid: !!(
      form.countryCode &&
      form.planMonths &&
      form.payerName.trim() &&
      form.payerEmail.trim() &&
      phoneOk &&
      (!documentRequired || form.payerDocument.trim()) &&
      form.province.trim()
    ),
    phoneMessage: phoneValidation.message
  };
}

export function buildMembershipCheckoutPayload(form: MembershipCheckoutForm, callbackUrl: string) {
  return {
    countryCode: form.countryCode!,
    planMonths: form.planMonths!,
    payerName: form.payerName.trim(),
    payerEmail: form.payerEmail.trim(),
    payerPhone: form.payerPhone.trim(),
    payerDocument: form.payerDocument.trim(),
    province: form.province.trim(),
    callbackUrl
  };
}

export function buildPayPalCheckoutPayload(form: MembershipCheckoutForm, callbackUrl: string) {
  return {
    countryCode: form.countryCode!,
    planMonths: form.planMonths!,
    payerName: form.payerName.trim(),
    payerEmail: form.payerEmail.trim(),
    payerPhone: form.payerPhone.trim() || undefined,
    payerDocument: form.payerDocument.trim() || undefined,
    province: form.province.trim(),
    callbackUrl
  };
}
