import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  getAllLeaveRequestsMock: vi.fn(),
  createUserMock: vi.fn(),
  activateUserMock: vi.fn(),
  deactivateUserMock: vi.fn(),
  resetUserPinMock: vi.fn(),
  useI18nMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/services/users.api", () => ({
  listUsers: mocks.listUsersMock,
  createUser: mocks.createUserMock,
  activateUser: mocks.activateUserMock,
  deactivateUser: mocks.deactivateUserMock,
  resetUserPin: mocks.resetUserPinMock,
}));

vi.mock("@/services/leave.api", () => ({
  getAllLeaveRequests: mocks.getAllLeaveRequestsMock,
}));

vi.mock("@/lib/i18n/use-i18n", () => ({
  useI18n: mocks.useI18nMock,
}));

import AdminUsersPage from "./page";

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.listUsersMock.mockResolvedValue([]);
    mocks.getAllLeaveRequestsMock.mockResolvedValue({ requests: [] });

    mocks.useI18nMock.mockReturnValue({
      locale: "en",
      t: (_section: string, key: string) => {
        if (key === "users") return "Users";
        if (key === "cancel") return "Cancel";
        if (key === "loading") return "Loading...";
        if (key === "save") return "Save";
        return key;
      },
    });
  });

  it("opens create form and submits new employee user", async () => {
    mocks.createUserMock.mockResolvedValue({
      id: 1,
      full_name: "Maria Ionescu",
      shift_number: "2",
      unique_code: "EMP100",
      is_active: true,
      role: "employee",
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(mocks.listUsersMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Full name"), {
      target: { value: "Maria Ionescu" },
    });

    fireEvent.change(screen.getByDisplayValue("Employee"), {
      target: { value: "employee" },
    });

    fireEvent.change(screen.getByPlaceholderText("Shift"), {
      target: { value: "2" },
    });

    fireEvent.change(screen.getByPlaceholderText("1234"), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.createUserMock).toHaveBeenCalledWith({
        full_name: "Maria Ionescu",
        role: "employee",
        shift_number: "2",
        pin: "1234",
      });
    });
  });

  it("submits mechanic user with null shift_number", async () => {
    mocks.createUserMock.mockResolvedValue({
      id: 2,
      full_name: "Ion Mecanic",
      shift_number: null,
      unique_code: "MECH100",
      is_active: true,
      role: "mechanic",
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(mocks.listUsersMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Full name"), {
      target: { value: "Ion Mecanic" },
    });

    fireEvent.change(screen.getByDisplayValue("Employee"), {
      target: { value: "mechanic" },
    });

    fireEvent.change(screen.getByPlaceholderText("1234"), {
      target: { value: "5678" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.createUserMock).toHaveBeenCalledWith({
        full_name: "Ion Mecanic",
        role: "mechanic",
        shift_number: null,
        pin: "5678",
      });
    });
  });
});

it("opens confirm dialog and deactivates user", async () => {
  mocks.listUsersMock.mockResolvedValue([
    {
      id: 10,
      full_name: "Ana Active",
      shift_number: "1",
      unique_code: "EMP010",
      is_active: true,
      role: "employee",
    },
  ]);

  mocks.deactivateUserMock.mockResolvedValue(undefined);

  render(<AdminUsersPage />);

  await waitFor(() => {
    expect(screen.getByText("Ana Active")).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole("button", { name: /active/i })[1]);
  fireEvent.click(screen.getByRole("button", { name: /inactive/i }));

  await waitFor(() => {
    expect(screen.getByText(/are you sure you want to deactivate ana active\?/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

  await waitFor(() => {
    expect(mocks.deactivateUserMock).toHaveBeenCalledWith(10);
  });
});