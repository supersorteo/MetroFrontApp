export interface CuitValidationResult {
  valid: boolean;
  type: 'EMPRESA' | 'PERSONA_FISICA' | 'UNKNOWN' | null;
  formatted: string | null;
  error?: string;
  warning?: string;
}

export function cleanCuit(raw: string): string {
  return raw.replace(/[-\s]/g, '');
}

export function formatCuit(digits: string): string {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function validateCuit(raw: string): CuitValidationResult {
  const digits = cleanCuit(raw);

  if (!digits) return { valid: false, type: null, formatted: null };
  if (!/^\d+$/.test(digits))
    return { valid: false, type: null, formatted: null, error: 'Solo se permiten números y guiones.' };
  if (digits.length < 11)
    return { valid: false, type: null, formatted: null, error: `Incompleto: ${digits.length} de 11 dígitos.` };
  if (digits.length > 11)
    return { valid: false, type: null, formatted: null, error: 'No puede tener más de 11 dígitos.' };

  const prefix = parseInt(digits.slice(0, 2), 10);
  const type: CuitValidationResult['type'] =
    [30, 33, 34].includes(prefix) ? 'EMPRESA' :
    [20, 23, 24, 27].includes(prefix) ? 'PERSONA_FISICA' : 'UNKNOWN';

  const formatted = formatCuit(digits);

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  const computed = 11 - (sum % 11);

  if (computed === 10)
    return { valid: false, type, formatted, error: 'CUIT/CUIL inválido: dígito verificador imposible.' };

  const verificador = computed === 11 ? 0 : computed;
  if (verificador !== parseInt(digits[10], 10))
    return { valid: false, type, formatted, error: 'CUIT/CUIL inválido: el dígito verificador no coincide.' };

  const warning = type === 'UNKNOWN' ? 'Prefijo no reconocido, verificá que sea un CUIT/CUIL válido.' : undefined;
  return { valid: true, type, formatted, warning };
}

// null = válido (o campo vacío/incompleto en modo live); string = error
export function diagnoseCuit(raw: string, live = false): string | null {
  const digits = cleanCuit(raw);
  if (!digits) return null;
  if (!/^\d+$/.test(digits)) return 'Solo se permiten números y guiones.';
  if (digits.length < 11) return live ? null : `Incompleto: ${digits.length} de 11 dígitos.`;
  if (digits.length > 11) return 'No puede tener más de 11 dígitos.';
  const result = validateCuit(raw);
  return result.valid ? null : (result.error ?? null);
}
