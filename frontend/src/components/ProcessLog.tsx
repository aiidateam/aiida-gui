import styled from "styled-components";
import { useEffect, useState } from "react";

export const ProcessLogStyle = styled.div`
  .log-section {
    border: 1px solid #ddd;
    padding: 1em;
    overflow-x: auto;
    overflow-y: auto;
    font-family: monospace;
    white-space: pre;
    font-size: 1.2em;
    color: #444;
    line-height: 1.4;
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .log-content {
    flex-grow: 1;
  }
`;

interface ProcessLogProps {
  id?: string;
}

export default function ProcessLog({ id }: ProcessLogProps) {
  const [fetchedLogs, setFetchedLogs] = useState<string[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!id) {
        return;
      }
      try {
        const response = await fetch(`/api/process-logs/${id}`);
        if (!response.ok) {
          throw new Error(`Request failed with HTTP ${response.status}`);
        }
        const data = (await response.json()) as string[];
        setFetchedLogs(data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [id]);

  return (
    <ProcessLogStyle>
      <div className="log-section">
        <h3>Log Information</h3>
        <div className="log-content">
          {fetchedLogs.map((log, index) => (
            <div key={`${index}-${log.slice(0, 24)}`}>{log}</div>
          ))}
        </div>
      </div>
    </ProcessLogStyle>
  );
}
