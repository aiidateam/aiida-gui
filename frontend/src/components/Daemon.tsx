import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  DaemonWorker,
  getAiidaRestClient,
  JsonApiError,
} from "../client/aiidaRestClient";

type DaemonAction = "start" | "stop" | "restart" | "increase" | "decrease";

export default function Daemon() {
  const [workers, setWorkers] = useState<DaemonWorker[]>([]);

  const fetchWorkers = async () => {
    try {
      const aiidaRestClient = await getAiidaRestClient();
      const data = await aiidaRestClient.daemon.worker();
      setWorkers(Object.values(data));
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  };

  useEffect(() => {
    void fetchWorkers();
    const interval = setInterval(fetchWorkers, 1000);
    return () => clearInterval(interval);
  }, []);

  const dispatchAction = async (action: DaemonAction) => {
    try {
      const aiidaRestClient = await getAiidaRestClient();
      if (action === "start") {
        await aiidaRestClient.daemon.start();
      } else if (action === "stop") {
        await aiidaRestClient.daemon.stop();
      } else if (action === "restart") {
        await aiidaRestClient.daemon.restart();
      } else if (action === "increase") {
        await aiidaRestClient.daemon.increase();
      } else if (action === "decrease") {
        await aiidaRestClient.daemon.decrease();
      }

      toast.success(`Daemon action ${action} succeeded`);
      await fetchWorkers();
    } catch (error) {
      const message =
        error instanceof JsonApiError
          ? error.message
          : "Daemon operation failed";
      toast.error(message);
    }
  };

  return (
    <div>
      <h2>Daemon Control</h2>
      <ToastContainer />
      <table className="table">
        <thead>
          <tr>
            <th>PID</th>
            <th>Memory %</th>
            <th>CPU %</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((worker) => (
            <tr key={worker.pid}>
              <td>{worker.pid}</td>
              <td>{worker.mem}</td>
              <td>{worker.cpu}</td>
              <td>{new Date(worker.started * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="button button-start"
        onClick={() => {
          void dispatchAction("start");
        }}
      >
        Start Daemon
      </button>
      <button
        className="button button-stop"
        onClick={() => {
          void dispatchAction("stop");
        }}
      >
        Stop Daemon
      </button>
      <button
        className="button button-restart"
        onClick={() => {
          void dispatchAction("restart");
        }}
      >
        Restart Daemon
      </button>
      <button
        className="button button-adjust"
        onClick={() => {
          void dispatchAction("increase");
        }}
      >
        Increase Workers
      </button>
      <button
        className="button button-adjust"
        onClick={() => {
          void dispatchAction("decrease");
        }}
      >
        Decrease Workers
      </button>
    </div>
  );
}
