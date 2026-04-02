import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ConfirmDialog from "./confirm-dialog";

describe("ConfirmDialog", () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    onConfirm.mockClear();
    onCancel.mockClear();
  });

  it("does not render when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        message="Sigur vrei să continui?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByText("Sigur vrei să continui?")).not.toBeInTheDocument();
  });

  it("renders content when open", () => {
    render(
      <ConfirmDialog
        open
        title="Ștergere"
        message="Sigur vrei să ștergi acest element?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Ștergere")).toBeInTheDocument();
    expect(screen.getByText("Sigur vrei să ștergi acest element?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmă" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anulează" })).toBeInTheDocument();
  });

  it("calls handlers when buttons are clicked", () => {
    render(
      <ConfirmDialog
        open
        message="Confirmi acțiunea?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirmă" }));
    fireEvent.click(screen.getByRole("button", { name: "Anulează" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows loading text and disables buttons when loading", () => {
    render(
      <ConfirmDialog
        open
        message="Se procesează cererea"
        loading
        loadingText="Se șterge..."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: "Se șterge..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anulează" })).toBeDisabled();
  });
});