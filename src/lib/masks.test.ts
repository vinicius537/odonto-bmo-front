import { describe, expect, it } from "vitest";

import {
  digitsOnly,
  formatCNPJ,
  formatCPF,
  formatPhoneBR,
  isValidBrazilPhone,
  isValidCNPJ,
  isValidCPF,
  normalizeBrazilPhoneDigits,
} from "@/lib/masks";

describe("masks", () => {
  it("formats and validates brazilian phone numbers", () => {
    expect(formatPhoneBR("85999887766")).toBe("(85) 99988-7766");
    expect(normalizeBrazilPhoneDigits("+55 (85) 99988-7766")).toBe("85999887766");
    expect(isValidBrazilPhone("85999887766")).toBe(true);
    expect(isValidBrazilPhone("859998877")).toBe(false);
  });

  it("formats and validates cpf", () => {
    expect(formatCPF("93541134780")).toBe("935.411.347-80");
    expect(isValidCPF("93541134780")).toBe(true);
    expect(isValidCPF("11111111111")).toBe(false);
  });

  it("formats and validates cnpj", () => {
    expect(formatCNPJ("11444777000161")).toBe("11.444.777/0001-61");
    expect(isValidCNPJ("11444777000161")).toBe(true);
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });

  it("extracts only digits", () => {
    expect(digitsOnly("11.444.777/0001-61")).toBe("11444777000161");
  });
});
