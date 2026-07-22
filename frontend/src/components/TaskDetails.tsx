import styled from "styled-components";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useNavigate } from "react-router-dom";

const WorkFlowButton = styled.button`
  padding: 10px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    color: #666;
  }
`;

const TaskDetailsPanel = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background-color: #fff;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  width: 25%;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow-y: auto;
  z-index: 20;
  border-left: 1px solid #ddd;
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

const NodeDetailRow = styled.div`
  display: flex;
  border-bottom: 1px solid #eee;
  padding: 0.5em 0;
`;

const NodeDetailProperty = styled.div`
  width: 50%;
  font-weight: bold;
  text-align: left;
  font-size: 0.9em;
  color: #555;
`;

const NodeDetailValue = styled.div`
  width: 50%;
  text-align: left;
  font-size: 0.8em;
  color: #666;
`;

const CloseButton = styled.button`
  align-self: flex-end;
  margin-bottom: 10px;
`;

const PythonCode = styled(SyntaxHighlighter)`
  width: 100%;
  max-width: 100%;
  max-height: 300px;
  overflow-x: auto;
  white-space: pre;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  background-color: #f7f7f7;
  font-family: monospace;
`;

export interface TaskNode {
  label?: string;
  node_type?: string;
  state?: string;
  process?: { pk?: number };
  metadata?: Array<[string, string | number | null | undefined]>;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  executor?: string;
}

interface TaskDetailsProps {
  selectedNode: TaskNode;
  onClose: () => void;
  setShowTaskDetails: (value: boolean) => void;
  parentPk?: string;
  parentPath?: string;
}

function renderInputs(inputs: Record<string, unknown>) {
  return Object.entries(inputs).map(([key, value]) => {
    if (Array.isArray(value)) {
      const nodeId = value[0];
      return (
        <li key={key}>
          {key}: <a href={`/datanode/${nodeId}`}>{String(nodeId)}</a>
        </li>
      );
    }
    if (value && typeof value === "object") {
      return (
        <li key={key}>
          {key}:<ul>{renderInputs(value as Record<string, unknown>)}</ul>
        </li>
      );
    }
    return null;
  });
}

export default function TaskDetails({
  selectedNode,
  onClose,
  setShowTaskDetails,
  parentPk,
  parentPath,
}: TaskDetailsProps) {
  const navigate = useNavigate();
  const nodeType = selectedNode.node_type?.toUpperCase() || "";
  const nodeLabel = selectedNode.label || "";
  const processPk = selectedNode.process?.pk;
  const nodeState = selectedNode.state?.toUpperCase() || "";

  const handleClose = () => {
    setShowTaskDetails(false);
    onClose();
  };

  const navigateSubRoute = () => {
    if (!parentPk) {
      return;
    }
    if (parentPath) {
      navigate(`/workgraph/${parentPk}/${parentPath}/${nodeLabel}`);
    } else {
      navigate(`/workgraph/${parentPk}/${nodeLabel}`);
    }
  };

  const handleWorkFlowClick = () => {
    if (nodeType === "GRAPH_TASK") {
      if (processPk) {
        navigate(`/workgraph/${processPk}`);
      }
    } else if (nodeType === "WORKGRAPH") {
      if (processPk) {
        navigate(`/workgraph/${processPk}`);
      } else {
        navigateSubRoute();
      }
    } else if (nodeType === "MAP") {
      if (["RUNNING", "FINISHED", "FAILED"].includes(nodeState)) {
        navigateSubRoute();
      }
    } else if (nodeType.includes("WORKCHAIN")) {
      if (processPk) {
        navigate(`/workchain/${processPk}`);
      }
    }
  };

  let isButtonDisabled = false;
  if (nodeType === "GRAPH_TASK") {
    isButtonDisabled = !processPk;
  } else if (nodeType === "WORKGRAPH") {
    isButtonDisabled = false;
  } else if (nodeType === "MAP") {
    isButtonDisabled = !["RUNNING", "FINISHED", "FAILED"].includes(nodeState);
  }

  return (
    <TaskDetailsPanel>
      <CloseButton onClick={handleClose}>Close</CloseButton>

      <TaskDetailsTitle>Task Details</TaskDetailsTitle>

      {["GRAPH_TASK", "WORKGRAPH", "MAP"].includes(nodeType) ? (
        <WorkFlowButton
          onClick={handleWorkFlowClick}
          disabled={isButtonDisabled}
        >
          Go to WorkGraph
        </WorkFlowButton>
      ) : null}
      {nodeType.includes("WORKCHAIN") ? (
        <WorkFlowButton
          onClick={handleWorkFlowClick}
          disabled={isButtonDisabled}
        >
          Go to WorkChain
        </WorkFlowButton>
      ) : null}

      {selectedNode ? (
        <TaskDetailsTable>
          {selectedNode.metadata?.map(([property, value]) => (
            <NodeDetailRow key={property}>
              <NodeDetailProperty>{property}</NodeDetailProperty>
              <NodeDetailValue>{String(value ?? "")}</NodeDetailValue>
            </NodeDetailRow>
          ))}
        </TaskDetailsTable>
      ) : null}
      <div>
        <TaskDetailsTitle>Inputs:</TaskDetailsTitle>
      </div>
      <TaskDetailsTable>
        <ul style={{ margin: 10, padding: 5, textAlign: "left" }}>
          {renderInputs(selectedNode.inputs || {})}
        </ul>
      </TaskDetailsTable>

      <div>
        <TaskDetailsTitle>Outputs:</TaskDetailsTitle>
      </div>
      <TaskDetailsTable>
        <ul style={{ margin: 10, padding: 5, textAlign: "left" }}>
          {renderInputs(selectedNode.outputs || {})}
        </ul>
      </TaskDetailsTable>

      <div>
        <TaskDetailsTitle>Executor:</TaskDetailsTitle>
      </div>
      <PythonCode language="python" style={dark}>
        {selectedNode.executor || ""}
      </PythonCode>
    </TaskDetailsPanel>
  );
}
