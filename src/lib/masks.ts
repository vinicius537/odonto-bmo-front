function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function digitsOnly(value: string | null | undefined) {
  return onlyDigits(value ?? "");
}

export function normalizeBrazilPhoneDigits(value: string | null | undefined) {
  const digits = onlyDigits(value ?? "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

export function formatPhoneBR(value: string | null | undefined) {
  const digits = normalizeBrazilPhoneDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidBrazilPhone(value: string | null | undefined) {
  const digits = normalizeBrazilPhoneDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatCPF(value: string | null | undefined) {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCPF(value: string | null | undefined) {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  return remainder === Number(digits[10]);
}

export function formatCNPJ(value: string | null | undefined) {
  const digits = digitsOnly(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function isValidCNPJ(value: string | null | undefined) {
  const digits = digitsOnly(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calculateVerifier = (base: string) => {
    let factor = base.length - 7;
    let total = 0;

    for (let index = 0; index < base.length; index += 1) {
      total += Number(base[index]) * factor;
      factor -= 1;
      if (factor < 2) {
        factor = 9;
      }
    }

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstVerifier = calculateVerifier(digits.slice(0, 12));
  const secondVerifier = calculateVerifier(`${digits.slice(0, 12)}${firstVerifier}`);

  return `${firstVerifier}${secondVerifier}` === digits.slice(12);
}
