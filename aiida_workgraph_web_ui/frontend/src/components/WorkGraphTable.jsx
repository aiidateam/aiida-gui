import NodeTable from './NodeTable'; // ✅ import the generic table

export default () =>
  <NodeTable
    title="WorkGraph"
    endpointBase="http://localhost:8000/api/workgraph"
    linkPrefix="/workgraph"
  />
