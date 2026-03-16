import { describe, expect, it } from "vitest";

import { hasModuleAccess, resolveModuleFlags } from "@/features/auth/modules";

describe("module access", () => {
  it("applies admin defaults when no settings are provided", () => {
    const modules = resolveModuleFlags("admin");

    expect(modules.dashboard).toBe(true);
    expect(modules.configuracoes).toBe(true);
    expect(modules.estoque).toBe(true);
  });

  it("allows overriding modules from membership settings", () => {
    const modules = resolveModuleFlags("secretaria", {
      modules: {
        equipe: true,
        financeiro: false,
      },
    });

    expect(modules.equipe).toBe(true);
    expect(modules.financeiro).toBe(false);
    expect(modules.agenda).toBe(true);
  });

  it("blocks inactive memberships even when the module is enabled", () => {
    expect(
      hasModuleAccess(
        {
          role: "admin",
          status: "inactive",
          settings: {
            modules: {
              dashboard: true,
            },
          },
        },
        "dashboard",
      ),
    ).toBe(false);
  });

  it("combines role access with plan module access", () => {
    expect(
      hasModuleAccess(
        {
          role: "admin",
          status: "active",
          settings: {
            modules: {
              estoque: true,
            },
          },
        },
        "estoque",
        {
          estoque: false,
        },
      ),
    ).toBe(false);
  });
});
