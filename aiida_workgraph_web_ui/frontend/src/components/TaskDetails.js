import React from 'react';
import styled from 'styled-components';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNavigate } from 'react-router-dom';

const WorkGraphButton = styled.button`
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

function TaskDetails({
  selectedNode,
  onClose,
  setShowTaskDetails,
  parentPk,
  parentPath,
}) {
  const navigate = useNavigate();
  const nodeType = selectedNode.node_type?.toUpperCase() || '';
  const nodeLabel = selectedNode.label;
  const processPk = selectedNode.process?.pk;
  const nodeState = selectedNode.state?.toUpperCase() || '';

  console.log('TaskDetails:', selectedNode);

  const handleClose = () => {
    setShowTaskDetails(false);
    onClose();
  };

  /**
   * Utility to navigate to the sub-route if there's no direct process PK.
   * E.g. /workgraph/45082/foo/bar
   */
  const navigateSubRoute = () => {
    if (parentPath) {
      navigate(`/workgraph/${parentPk}/${parentPath}/${nodeLabel}`);
    } else {
      navigate(`/workgraph/${parentPk}/${nodeLabel}`);
    }
  };

  /**
   * Main click handler for the "Go to WorkGraph" button
   */
  const handleWorkGraphClick = () => {
    if (nodeType === 'GRAPH_BUILDER') {
      // Only valid if we have a processPk
      if (processPk) {
        navigate(`/workgraph/${processPk}`);
      }
      // else disabled, do nothing
    }
    else if (nodeType === 'WORKGRAPH') {
      // If there's a real process, navigate to that
      // otherwise sub-route
      if (processPk) {
        navigate(`/workgraph/${processPk}`);
      } else {
        navigateSubRoute();
      }
    }
    else if (nodeType === 'MAP') {
      // For MAP, only if the state is in [RUNNING, FINISHED, FAILED]
      if (['RUNNING', 'FINISHED', 'FAILED'].includes(nodeState)) {
        navigateSubRoute();
      }
      // else disabled, do nothing
    }
    else if (nodeType.includes('WORKCHAIN')) {
      console.log("WORKCHAIN nodeType: ", nodeType);
      console.log("processPk: ", processPk)
      if (processPk) {
        navigate(`/workchain/${processPk}`);
      }
    }

  };

  /**
   * isButtonDisabled logic:
   *  - GRAPH_BUILDER => disabled if no processPk
   *  - WORKGRAPH => always enabled (sub-route is fallback)
   *  - MAP => enabled only if state in [RUNNING, FINISHED, FAILED], else disabled
   */
  let isButtonDisabled = false;
  if (nodeType === 'GRAPH_BUILDER') {
    isButtonDisabled = !processPk;
  }
  else if (nodeType === 'WORKGRAPH') {
    isButtonDisabled = false; // always enabled (sub-route fallback)
  }
  else if (nodeType === 'MAP') {
    isButtonDisabled = !['RUNNING', 'FINISHED', 'FAILED'].includes(nodeState);
  }

  /**
   * Render a nested list of inputs or outputs.
   */
  const renderInputs = (inputs, depth = 0) => {
    return Object.entries(inputs).map(([key, value]) => {
      if (Array.isArray(value)) {
        // e.g. [nodeId, nodeType]
        const nodeId = value[0];
        return (
          <li key={key}>
            {key}: <a href={`/datanode/${nodeId}`}>{nodeId}</a>
          </li>
        );
      } else if (typeof value === 'object' && value !== null) {
        // Nested dictionary
        return (
          <li key={key}>
            {key}:
            <ul>{renderInputs(value, depth + 1)}</ul>
          </li>
        );
      }
      return null;
    });
  };

  return (
    <TaskDetailsPanel>
      <CloseButton onClick={handleClose}>Close</CloseButton>

      <TaskDetailsTitle>Task Details</TaskDetailsTitle>

      {/* Show button only if type is GRAPH_BUILDER, WORKGRAPH, or MAP */}
      {['GRAPH_BUILDER', 'WORKGRAPH', 'MAP'].includes(nodeType) && (
        <WorkGraphButton onClick={handleWorkGraphClick} disabled={isButtonDisabled}>
          Go to WorkGraph
        </WorkGraphButton>
      )}
      {nodeType.includes('WORKCHAIN') && (
        <WorkGraphButton onClick={handleWorkGraphClick} disabled={isButtonDisabled}>
          Go to WorkChain
        </WorkGraphButton>
      )}

      {/* Metadata table */}
      {selectedNode && (
        <TaskDetailsTable>
          {selectedNode.metadata?.map(([property, value]) => (
            <NodeDetailRow key={property}>
              <NodeDetailProperty>{property}</NodeDetailProperty>
              <NodeDetailValue>{value}</NodeDetailValue>
            </NodeDetailRow>
          ))}
        </TaskDetailsTable>
      )}
      <div>
        <TaskDetailsTitle>Inputs:</TaskDetailsTitle>
      </div>
      <TaskDetailsTable>
        <ul style={{ margin: 10, padding: 5, textAlign: 'left' }}>
          {renderInputs(selectedNode.inputs || {})}
        </ul>
      </TaskDetailsTable>

      {/* Outputs */}
      <div>
        <TaskDetailsTitle>Outputs:</TaskDetailsTitle>
      </div>
      <TaskDetailsTable>
        <ul style={{ margin: 10, padding: 5, textAlign: 'left' }}>
          {renderInputs(selectedNode.outputs || {})}
        </ul>
      </TaskDetailsTable>

      {/* Executor code */}
      <div>
        <TaskDetailsTitle>Executor:</TaskDetailsTitle>
      </div>
      <PythonCode language="python" style={dark}>
        {selectedNode.executor}
      </PythonCode>
    </TaskDetailsPanel>
  );
}

export default TaskDetails;
