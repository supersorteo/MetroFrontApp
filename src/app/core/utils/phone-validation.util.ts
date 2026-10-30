export interface PhoneCountry {
  code: string;
  flag: string;
  label: string;
  placeholder: string;
  maxLength: number;
  // live=true → omite el error "incompleto" (se usa mientras el usuario escribe)
  diagnose(localDigits: string, live?: boolean): string | null;
}

// ─── Argentina ────────────────────────────────────────────────────────────────

const AR_AREA_2 = ['11'];
const AR_AREA_3 = [
  '221','223','230','236','237','249','260','261','263','264','266',
  '280','291','294','297','298','299','336','341','342','343','345','348','351','358',
  '362','370','376','379','380','381','383','385','387','388'
];
const AR_AREA_4 = ['2901','2920','2954','2966'];

// Evalúa si los dígitos ingresados son compatibles con algún código de área argentino.
// Permite validación incremental: con 2 dígitos ya puede detectar prefijos inválidos.
function hasValidARPrefix(d: string): boolean {
  if (d.length <= 1) return true;
  if (d.length === 2) {
    return AR_AREA_2.includes(d)
      || AR_AREA_3.some(a => a.startsWith(d))
      || AR_AREA_4.some(a => a.startsWith(d));
  }
  if (d.length === 3) {
    return AR_AREA_3.includes(d)
      || AR_AREA_4.some(a => a.startsWith(d))
      || AR_AREA_2.includes(d.slice(0, 2));
  }
  // length >= 4
  return AR_AREA_4.includes(d.slice(0, 4))
    || AR_AREA_3.includes(d.slice(0, 3))
    || AR_AREA_2.includes(d.slice(0, 2));
}

function diagnoseAR(d: string, live = false): string | null {
  if (d.startsWith('0'))
    return 'No incluyas el 0 inicial. Ingresá directo el código de área. Ej: 1134567890';
  if (d.startsWith('15'))
    return 'No incluyas el 15. Ingresá el código de área seguido del número. Ej: 1134567890';
  if (d.length >= 4 && /^\d{2}15/.test(d))
    return 'No incluyas el 15 después del código de área. Ej: para GBA ingresá 1134567890';
  if (!hasValidARPrefix(d))
    return 'El código de área no corresponde a ninguna provincia. Verificá los primeros dígitos';
  if (d.length < 10)
    return live ? null : `Número incompleto: ingresaste ${d.length} de 10 dígitos`;
  if (AR_AREA_4.includes(d.slice(0, 4)) && d.slice(4).length === 6) return null;
  if (AR_AREA_3.includes(d.slice(0, 3)) && d.slice(3).length === 7) return null;
  if (AR_AREA_2.includes(d.slice(0, 2)) && d.slice(2).length === 8) return null;
  return 'El código de área no corresponde a ninguna provincia. Verificá los primeros dígitos e intentá nuevamente';
}

// ─── Uruguay ──────────────────────────────────────────────────────────────────

function diagnoseUY(d: string, live = false): string | null {
  if (d.length > 0 && d[0] !== '9')
    return 'Los números móviles de Uruguay empiezan con 9. Ej: 91234567';
  if (d.length < 8)
    return live ? null : `Número incompleto: ingresaste ${d.length} de 8 dígitos`;
  return null;
}

// ─── Colombia ─────────────────────────────────────────────────────────────────

function diagnoseCO(d: string, live = false): string | null {
  if (d.length > 0 && d[0] !== '3')
    return 'Los números móviles de Colombia empiezan con 3. Ej: 3001234567';
  if (d.length < 10)
    return live ? null : `Número incompleto: ingresaste ${d.length} de 10 dígitos`;
  return null;
}

// ─── Cuba ─────────────────────────────────────────────────────────────────────

function diagnoseCU(d: string, live = false): string | null {
  if (d.length >= 2 && d[0] !== '5' && d.slice(0, 2) !== '63')
    return 'Los números de Cuba empiezan con 5 (móvil) o 63 (fijo). Ej: 51234567';
  if (d.length === 1 && d[0] !== '5' && d[0] !== '6')
    return 'Los números de Cuba empiezan con 5 (móvil) o 6 (fijo). Ej: 51234567';
  if (d.length < 8)
    return live ? null : `Número incompleto: ingresaste ${d.length} de 8 dígitos`;
  return null;
}

// ─── Paraguay ────────────────────────────────────────────────────────────────

function diagnosePY(d: string, live = false): string | null {
  if (d.length > 0 && d[0] !== '9')
    return 'Los números de Paraguay empiezan con 9. Ej: 961234567';
  if (d.length >= 2 && !/[2-9]/.test(d[1]))
    return 'El segundo dígito debe estar entre 2 y 9. Operadoras: 96, 97, 98... Ej: 961234567';
  if (d.length < 9)
    return live ? null : `Número incompleto: ingresaste ${d.length} de 9 dígitos`;
  return null;
}

// ─── Exportaciones ────────────────────────────────────────────────────────────

export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    code: '+549',
    flag: '🇦🇷',
    label: '🇦🇷 +549',
    placeholder: 'Ej: 1134567890 (sin 0 ni 15)',
    maxLength: 10,
    diagnose: diagnoseAR,
  },
  {
    code: '+54',
    flag: '🇦🇷',
    label: '🇦🇷 +54',
    placeholder: 'Ej: 1134567890 (sin 0)',
    maxLength: 10,
    diagnose: diagnoseAR,
  },
  {
    code: '+598',
    flag: '🇺🇾',
    label: '🇺🇾 +598',
    placeholder: 'Ej: 91234567',
    maxLength: 8,
    diagnose: diagnoseUY,
  },
  {
    code: '+57',
    flag: '🇨🇴',
    label: '🇨🇴 +57',
    placeholder: 'Ej: 3001234567',
    maxLength: 10,
    diagnose: diagnoseCO,
  },
  {
    code: '+53',
    flag: '🇨🇺',
    label: '🇨🇺 +53',
    placeholder: 'Ej: 51234567',
    maxLength: 8,
    diagnose: diagnoseCU,
  },
  {
    code: '+595',
    flag: '🇵🇾',
    label: '🇵🇾 +595',
    placeholder: 'Ej: 961234567',
    maxLength: 9,
    diagnose: diagnosePY,
  },
];

export function cleanPhoneDigits(raw: string): string {
  return raw.replace(/[\s\-()+]/g, '');
}

export function validatePhone(
  code: string,
  raw: string,
  live = false
): { valid: boolean; e164?: string; error?: string } {
  const digits = cleanPhoneDigits(raw);
  if (!digits) return { valid: false, error: 'El número es obligatorio.' };
  if (!/^\d+$/.test(digits))
    return { valid: false, error: 'Solo se permiten dígitos. Podés usar espacios o guiones como separadores.' };
  const country = PHONE_COUNTRIES.find((c) => c.code === code);
  if (!country) return { valid: false, error: 'País no reconocido.' };
  const error = country.diagnose(digits, live);
  if (error) return { valid: false, error };
  return { valid: true, e164: `${code}${digits}` };
}
