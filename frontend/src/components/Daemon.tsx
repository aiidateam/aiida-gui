import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface DaemonWorker {
  pid: number;
  mem: number;
  cpu: number;
  started: number;
}

type DaemonAction = "start" | "stop" | "increase" | "decrease";

export default function Daemon() {
  const [workers, setWorkers] = useState<DaemonWorker[]>([]);

  const fetchWorkers = () => {
    fetch("/api/daemon/worker")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Worker fetch failed with HTTP ${response.status}`);
        }
        return response.json() as Promise<Record<string, DaemonWorker>>;
      })
      .then((data) => setWorkers(Object.values(data)))
      .catch((error) => console.error("Failed to fetch workers:", error));
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendAction = (action: DaemonAction) => {
    fetch(`/api/daemon/${action}`, { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Daemon operation failed: ${response.statusText}`);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Daemon action ${action} succeeded`);
        fetchWorkers();
      })
      .catch((error: Error) => toast.error(error.message));
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
        onClick={() => sendAction("start")}
      >
        Start Daemon
      </button>
      <button className="button button-stop" onClick={() => sendAction("stop")}>
        Stop Daemon
      </button>
      <button
        className="button button-adjust"
        onClick={() => sendAction("increase")}
      >
        Increase Workers
      </button>
      <button
        className="button button-adjust"
        onClick={() => sendAction("decrease")}
      >
        Decrease Workers
      </button>
    </div>
  );
}
