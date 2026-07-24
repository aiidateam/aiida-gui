import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { getAiidaRestClient } from "../client/aiidaRestClient";

interface DaemonWorker {
  pid: number;
  mem: number;
  cpu: number;
  started: number;
}

type DaemonAction = "start" | "stop" | "increase" | "decrease";

export default function Daemon() {
  const [workers, setWorkers] = useState<DaemonWorker[]>([]);

  const fetchWorkers = async () => {
    try {
      const restApiClient = await getAiidaRestClient();
      const data = await restApiClient.daemon.worker();
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
      const restApiClient = await getAiidaRestClient();
      if (action === "start") {
        await restApiClient.daemon.start();
      } else if (action === "stop") {
        await restApiClient.daemon.stop();
      } else if (action === "increase") {
        await restApiClient.daemon.increase();
      } else {
        await restApiClient.daemon.decrease();
      }

      toast.success(`Daemon action ${action} succeeded`);
      await fetchWorkers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Daemon operation failed";
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
