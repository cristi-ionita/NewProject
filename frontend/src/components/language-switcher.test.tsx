import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import LanguageSwitcher from "./language-switcher";

const mockSetLocale = vi.fn();

vi.mock("@/lib/i18n/use-i18n", () => ({
  useI18n: () => ({
    locale: "ro",
    setLocale: mockSetLocale,
  }),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    mockSetLocale.mockClear();
  });

  it("renders the active language", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole("button", { name: /română/i })).toBeInTheDocument();
  });

  it("opens the menu and changes language", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /română/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /english/i }));

    expect(mockSetLocale).toHaveBeenCalledWith("en");
  });

  it("closes on escape", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /română/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("button", { name: /română/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});