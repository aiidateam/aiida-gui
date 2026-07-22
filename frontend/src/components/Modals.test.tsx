import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ConfirmDeleteModal } from "./Modals";

describe("ConfirmDeleteModal", () => {
  test("renders title and body content", () => {
    render(
      <ConfirmDeleteModal
        open
        title="Delete process"
        body={<span>Do you really want to delete this process?</span>}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByText("Delete process")).toBeInTheDocument();
    expect(
      screen.getByText("Do you really want to delete this process?"),
    ).toBeInTheDocument();
  });

  test("calls handlers when action buttons are clicked", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDeleteModal
        open
        body={<span>Confirm action</span>}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
