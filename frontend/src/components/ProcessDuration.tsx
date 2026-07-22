import { useEffect, useState } from "react";

interface ProcessStateEntry {
  ctime?: string;
  mtime?: string;
  process_type?: string;
}

interface TimelineRow {
  key: string;
  title: string;
  startTime: number | null;
  endTime: number | null;
}

interface NodeDurationGraphProps {
  id?: string;
}

type ItemType = "task" | "called_process";

export default function NodeDurationGraph({ id }: NodeDurationGraphProps) {
  const [processesInfo, setProcessesInfo] = useState<
    Record<string, ProcessStateEntry>
  >({});
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [timeStart, setTimeStart] = useState<number | null>(null);
  const [timeEnd, setTimeEnd] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [useItemType, setUseItemType] = useState<ItemType>("called_process");

  const parseTime = (value?: string) => {
    if (!value) {
      return null;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const formatTime = (value: number | null) => {
    if (value === null) {
      return "-";
    }

    return new Date(value).toLocaleString();
  };

  const clampWidthPercent = (value: number) =>
    Math.max(0, Math.min(100, value));

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        return;
      }
      try {
        const response = await fetch(
          `/api/workchain-state/${id}?item_type=${useItemType}`,
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = (await response.json()) as Record<
          string,
          ProcessStateEntry
        >;
        setProcessesInfo(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    setInitialLoad(true);
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id, useItemType]);

  useEffect(() => {
    if (Object.keys(processesInfo).length) {
      const newRows: TimelineRow[] = Object.entries(processesInfo).map(
        ([key, { ctime, mtime }]) => ({
          key,
          title: key,
          startTime: parseTime(ctime),
          endTime: parseTime(mtime),
        }),
      );

      setRows(newRows);

      if (initialLoad) {
        const validStartTimes = newRows
          .map((item) => item.startTime)
          .filter((time): time is number => time !== null);
        const validEndTimes = newRows
          .map((item) => item.endTime)
          .filter((time): time is number => time !== null);
        if (validStartTimes.length && validEndTimes.length) {
          setTimeStart(Math.min(...validStartTimes));
          setTimeEnd(Math.max(...validEndTimes));
        } else {
          const now = Date.now();
          setTimeStart(now);
          setTimeEnd(now + 60 * 60 * 1000);
        }
        setInitialLoad(false);
      }
    } else {
      setRows([]);
      setTimeStart(null);
      setTimeEnd(null);
    }
  }, [processesInfo, initialLoad]);

  const totalWindow =
    timeStart !== null && timeEnd !== null && timeEnd > timeStart
      ? timeEnd - timeStart
      : null;

  return (
    <div style={{ padding: "10px", margin: "20px", border: "1px solid #ccc" }}>
      <h1 style={{ textAlign: "center", color: "#2a3f5f" }}>
        Node Process Timeline
      </h1>
      <div style={{ textAlign: "left", fontSize: "16px", color: "#555" }}>
        <p>
          The timeline uses bars to represent the active periods of process
          nodes, marked from their creation (ctime) to their last modification
          (mtime). It is important to note that these timestamps do not
          necessarily correlate with the actual running time since processes
          might be queued or paused.
        </p>
        <p>Data nodes are shown as rows without bars.</p>
      </div>
      <div style={{ margin: "10px" }}>
        <label>
          Task:
          <input
            type="radio"
            value="task"
            checked={useItemType === "task"}
            onChange={(event) => setUseItemType(event.target.value as ItemType)}
          />
        </label>
        <label style={{ marginLeft: "20px" }}>
          Called Process:
          <input
            type="radio"
            value="called_process"
            checked={useItemType === "called_process"}
            onChange={(event) => setUseItemType(event.target.value as ItemType)}
          />
        </label>
      </div>
      {rows.length > 0 &&
      timeStart !== null &&
      timeEnd !== null &&
      totalWindow ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 280px) 1fr 220px 220px",
              gap: "12px",
              alignItems: "center",
              fontWeight: 700,
              borderBottom: "1px solid #ddd",
              padding: "8px 12px",
              marginBottom: "8px",
            }}
          >
            <div>Node</div>
            <div>Timeline</div>
            <div>Created</div>
            <div>Updated</div>
          </div>
          {rows.map((row) => {
            const start = row.startTime;
            const rawEnd = row.endTime ?? row.startTime;
            const hasBar = start !== null && rawEnd !== null && rawEnd >= start;
            const startOffset = hasBar
              ? clampWidthPercent(((start - timeStart) / totalWindow) * 100)
              : 0;
            const endOffset = hasBar
              ? clampWidthPercent(((rawEnd - timeStart) / totalWindow) * 100)
              : 0;
            const width = hasBar ? Math.max(1.5, endOffset - startOffset) : 0;

            return (
              <div
                key={row.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 280px) 1fr 220px 220px",
                  gap: "12px",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div style={{ textAlign: "left", fontWeight: 600 }}>
                  {row.title}
                </div>
                <div
                  style={{
                    position: "relative",
                    height: "26px",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #edf2f7, #f8fafc)",
                    overflow: "hidden",
                  }}
                >
                  {hasBar ? (
                    <div
                      title={`${row.title}: ${formatTime(start)} -> ${formatTime(rawEnd)}`}
                      style={{
                        position: "absolute",
                        left: `${startOffset}%`,
                        width: `${width}%`,
                        top: "4px",
                        bottom: "4px",
                        borderRadius: "999px",
                        background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      No timing data
                    </div>
                  )}
                </div>
                <div
                  style={{
                    textAlign: "left",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatTime(row.startTime)}
                </div>
                <div
                  style={{
                    textAlign: "left",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatTime(row.endTime)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#D32F2F",
            marginTop: "20px",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          There are no items to display.
        </div>
      )}
    </div>
  );
}
