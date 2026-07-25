import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  type DaemonWorker,
  getAiidaRestClient,
  JsonApiError,
} from "../src/client/aiidaRestClient";
import Daemon from "../src/components/Daemon";

vi.mock("../src/client/aiidaRestClient", () => {
  class MockJsonApiError extends Error {}

  return {
    getAiidaRestClient: vi.fn(),
    JsonApiError: MockJsonApiError,
  };
});

const workerOne: DaemonWorker = {
  pid: 101,
  mem: 1.5,
  cpu: 2.5,
  started: 1_700_000_000,
};

const workerTwo: DaemonWorker = {
  pid: 202,
  mem: 3.5,
  cpu: 4.5,
  started: 1_700_000_100,
};

function createDaemonMock() {
  let workers: Record<string, DaemonWorker> = {};

  const daemon = {
    status: vi.fn(),
    worker: vi.fn(async () => workers),
    start: vi.fn(async () => {
      workers = { workerOne };
      return { running: true, num_workers: 1 };
    }),
    stop: vi.fn(async () => {
      workers = {};
      return { running: false, num_workers: null };
    }),
    restart: vi.fn(async () => {
      workers = { workerOne };
      return { running: true, num_workers: 1 };
    }),
    increase: vi.fn(async () => {
      workers = { workerOne, workerTwo };
      return { running: true, num_workers: 2 };
    }),
    decrease: vi.fn(async () => {
      workers = { workerOne };
      return { running: true, num_workers: 1 };
    }),
  };

  return daemon;
}

describe("Daemon", () => {
  let daemon: ReturnType<typeof createDaemonMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    daemon = createDaemonMock();
    vi.mocked(getAiidaRestClient).mockResolvedValue({
      daemon,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("polls for workers and clears the interval on unmount", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<Daemon />);

    await waitFor(() => {
      expect(daemon.worker).toHaveBeenCalledOnce();
    });
    expect(screen.getAllByRole("row")).toHaveLength(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    const intervalId = setIntervalSpy.mock.results[0].value;
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
  });

  test("updates worker rows after daemon actions", async () => {
    const user = userEvent.setup();
    render(<Daemon />);

    await waitFor(() => {
      expect(daemon.worker).toHaveBeenCalledOnce();
    });

    await user.click(screen.getByRole("button", { name: "Start Daemon" }));
    await waitFor(() => {
      expect(daemon.start).toHaveBeenCalledOnce();
      expect(screen.getAllByRole("row")).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Restart Daemon" }));
    await waitFor(() => {
      expect(daemon.restart).toHaveBeenCalledOnce();
      expect(screen.getAllByRole("row")).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Increase Workers" }));
    await waitFor(() => {
      expect(daemon.increase).toHaveBeenCalledOnce();
      expect(screen.getAllByRole("row")).toHaveLength(3);
    });

    await user.click(screen.getByRole("button", { name: "Decrease Workers" }));
    await waitFor(() => {
      expect(daemon.decrease).toHaveBeenCalledOnce();
      expect(screen.getAllByRole("row")).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Stop Daemon" }));
    await waitFor(() => {
      expect(daemon.stop).toHaveBeenCalledOnce();
      expect(screen.getAllByRole("row")).toHaveLength(1);
    });
  });

  test("shows JSON:API errors from daemon actions", async () => {
    const user = userEvent.setup();
    daemon.start.mockRejectedValue(
      new JsonApiError("The daemon could not be started.", 500),
    );
    render(<Daemon />);

    await user.click(screen.getByRole("button", { name: "Start Daemon" }));

    expect(
      await screen.findByText("The daemon could not be started."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Daemon action start succeeded"),
    ).not.toBeInTheDocument();
  });
});
