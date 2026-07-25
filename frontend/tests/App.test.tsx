import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, test, expect } from "vitest";

import App from "../src/App";

function mockPluginListSuccess(plugins: string[] = []) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ plugins }),
  } as Response);
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  mockPluginListSuccess([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("shows plugin loading state before resolving", () => {
  vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

  render(<App />);
  expect(screen.getByText(/loading plugin list/i)).toBeInTheDocument();
});

test("renders home content after plugin fetch", async () => {
  render(<App />);
  const homeElement = await screen.findByText(/welcome to aiida/i);
  expect(homeElement).toBeInTheDocument();
});

test("renders plugin fetch error message when request fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({}),
  } as Response);

  render(<App />);

  expect(await screen.findByText(/error loading plugins/i)).toBeInTheDocument();
  expect(screen.getByText(/http 503/i)).toBeInTheDocument();
});

test("renders not found page on unknown route", async () => {
  window.history.pushState({}, "", "/does-not-exist");
  render(<App />);

  await waitFor(() => {
    expect(
      screen.getByText(/sorry, that page does not exist/i),
    ).toBeInTheDocument();
  });
});
