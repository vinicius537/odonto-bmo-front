import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

import Register from "@/pages/Register";

const navigateMock = vi.fn();
const registerMock = vi.fn();
const toastMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null }),
  };
});

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => ({
    status: "unauthenticated",
    register: registerMock,
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

describe("Register", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    registerMock.mockReset();
    toastMock.mockReset();
  });

  it("envia os dados de cadastro e redireciona para login ao criar a conta", async () => {
    registerMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Maria Silva" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "maria@teste.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: "senha123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("Maria Silva", "maria@teste.com", "senha123");
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Conta criada",
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });
});
