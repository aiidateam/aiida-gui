import styled from "styled-components";

export const WorkFlowInfoStyle = styled.div`
  width: 50%;
  padding: 1em;
  overflow-y: auto;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;

  h2 {
    margin-bottom: 0.5em;
    color: #333;
    font-size: 1.2em;
  }

  .info-table {
    flex-grow: 1;
    overflow-y: auto;
    margin-bottom: 1em;

    .info-row {
      display: flex;
      border-bottom: 1px solid #eee;
      padding: 0.5em 0;

      .property {
        width: 40%;
        font-weight: bold;
        text-align: left;
        font-size: 1.2em;
        color: #555;
      }

      .value {
        width: 60%;
        text-align: left;
        font-size: 1.2em;
        color: #666;
      }
    }
  }
`;

const TaskDetailsTitle = styled.h3`
  font-size: 1.2em;
  margin-bottom: 0.5em;
  color: #333;
`;

const TaskDetailsTable = styled.div`
  width: 100%;
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 1em;
  background-color: #f7f7f7;
`;

type SummaryEntry = [string, string | number | null | undefined];
type SummaryNestedValue =
  | SummaryNestedValueObject
  | [string | number, unknown, string?];
interface SummaryNestedValueObject {
  [key: string]: SummaryNestedValue;
}

export interface ProcessSummaryPayload {
  table?: SummaryEntry[];
  inputs?: SummaryNestedValueObject;
  outputs?: SummaryNestedValueObject;
  caller?: SummaryNestedValueObject;
  called?: SummaryNestedValueObject;
}

interface ProcessSummaryProps {
  summary: ProcessSummaryPayload;
}

function renderInputs(inputs: SummaryNestedValueObject) {
  return Object.entries(inputs).map(([key, value]) => {
    const nodeId = Array.isArray(value) ? value[0] : value;
    const nodeType = Array.isArray(value) ? value[2] : null;

    let prefix = "/datanode";

    if (typeof nodeType === "string") {
      if (nodeType.startsWith("data")) {
        prefix = "/datanode";
      } else if (nodeType.endsWith("WorkGraphNode.")) {
        prefix = "/workgraph";
      } else if (nodeType.endsWith("WorkChainNode.")) {
        prefix = "/workchain";
      } else {
        prefix = "/process";
      }
    }

    if (Array.isArray(value)) {
      return (
        <li key={key}>
          <span>
            {key}: <a href={`${prefix}/${nodeId}`}>{String(nodeId)}</a>
          </span>
        </li>
      );
    }

    if (value && typeof value === "object") {
      return (
        <li key={key}>
          <span>{key}:</span>
          <ul>{renderInputs(value as SummaryNestedValueObject)}</ul>
        </li>
      );
    }

    return null;
  });
}

export default function ProcessSummary({ summary }: ProcessSummaryProps) {
  const table = summary.table || [];
  const inputs = summary.inputs || {};
  const outputs = summary.outputs || {};
  const caller = summary.caller || {};
  const called = summary.called || {};

  return (
    <WorkFlowInfoStyle>
      <div>
        <h2>Summary</h2>
        <div className="info-table">
          {table.map(([property, value]) => (
            <div className="info-row" key={property}>
              <div className="property">{property}</div>
              <div className="value">{String(value ?? "")}</div>
            </div>
          ))}
        </div>
        <div>
          <TaskDetailsTitle>Inputs:</TaskDetailsTitle>
        </div>
        <TaskDetailsTable>
          <ul style={{ margin: 10, padding: 5, textAlign: "left" }}>
            {renderInputs(inputs)}
          </ul>
        </TaskDetailsTable>
        <div>
          <TaskDetailsTitle>Outputs:</TaskDetailsTitle>
        </div>
        <TaskDetailsTable>
          <ul style={{ margin: 10, padding: 5, textAlign: "left" }}>
            {renderInputs(outputs)}
          </ul>
        </TaskDetailsTable>
        <div>
          <TaskDetailsTitle>Caller Processes:</TaskDetailsTitle>
        </div>
        <TaskDetailsTable>
          <ul style={{ margin: 10, padding: 5, textAlign: "left" }}>
            {renderInputs(caller)}
          </ul>
        </TaskDetailsTable>
        <div>
          <TaskDetailsTitle>Called Processes:</TaskDetailsTitle>
        </div>
        <TaskDetailsTable>
          <ul style={{ margin: 10, padding: 5, textAlign: "left" }}>
            {renderInputs(called)}
          </ul>
        </TaskDetailsTable>
      </div>
    </WorkFlowInfoStyle>
  );
}
