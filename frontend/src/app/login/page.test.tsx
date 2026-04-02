import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  adminLoginMock: vi.fn(),
  userLoginMock: vi.fn(),
  getAdminTokenMock: vi.fn(),
  getMechanicSessionMock: vi.fn(),
  getUserSessionMock: vi.fn(),
  saveAdminTokenMock: vi.fn(),
  saveMechanicSessionMock: vi.fn(),
  saveUserSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replaceMock,
  }),
}));

vi.mock("@/services/auth.api", () => ({
  adminLogin: mocks.adminLoginMock,
  userLogin: mocks.userLoginMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminToken: mocks.getAdminTokenMock,
  getMechanicSession: mocks.getMechanicSessionMock,
  getUserSession: mocks.getUserSessionMock,
  saveAdminToken: mocks.saveAdminTokenMock,
  saveMechanicSession: mocks.saveMechanicSessionMock,
  saveUserSession: mocks.saveUserSessionMock,
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminTokenMock.mockReturnValue(null);
    mocks.getMechanicSessionMock.mockReturnValue(null);
    mocks.getUserSessionMock.mockReturnValue(null);
  });

  it("renders login form after session check", async () => {
    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("User")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("PIN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
  });

  it("logs in normal user and redirects to profile", async () => {
    mocks.userLoginMock.mockResolvedValue({
      user_id: 1,
      full_name: "Ana Popescu",
      shift_number: "2",
      unique_code: "EMP001",
      role: "employee",
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("User"), {
      target: { value: "EMP001" },
    });
    fireEvent.change(screen.getByPlaceholderText("PIN"), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mocks.userLoginMock).toHaveBeenCalledWith({
        identifier: "EMP001",
        pin: "1234",
      });
    });

    expect(mocks.saveUserSessionMock).toHaveBeenCalledWith({
      user_id: 1,
      full_name: "Ana Popescu",
      shift_number: "2",
      unique_code: "EMP001",
    });

    expect(mocks.replaceMock).toHaveBeenCalledWith("/app/profile");
  });

  it("logs in admin and redirects to admin dashboard", async () => {
    mocks.adminLoginMock.mockResolvedValue({
      token: "admin-token",
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("User"), {
      target: { value: "admin" },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "secret" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mocks.adminLoginMock).toHaveBeenCalledWith({
        password: "secret",
      });
    });

    expect(mocks.saveAdminTokenMock).toHaveBeenCalledWith("admin-token");
    expect(mocks.replaceMock).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("logs in mechanic and redirects to mechanic dashboard", async () => {
    mocks.userLoginMock.mockResolvedValue({
      user_id: 2,
      full_name: "Ion Mecanic",
      unique_code: "MECH001",
      role: "mechanic",
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("User"), {
      target: { value: "MECH001" },
    });
    fireEvent.change(screen.getByPlaceholderText("PIN"), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mocks.userLoginMock).toHaveBeenCalledWith({
        identifier: "MECH001",
        pin: "1234",
      });
    });

    expect(mocks.saveMechanicSessionMock).toHaveBeenCalledWith({
      user_id: 2,
      full_name: "Ion Mecanic",
      unique_code: "MECH001",
      role: "mechanic",
    });

    expect(mocks.replaceMock).toHaveBeenCalledWith("/mechanic/dashboard");
  });
});