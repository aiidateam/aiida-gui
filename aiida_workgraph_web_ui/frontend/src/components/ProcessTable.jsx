import NodeTable from './NodeTable'; // ✅ import the generic table


export default () =>
  <NodeTable
    title="Process"
    endpointBase="http://localhost:8000/api/process"
    linkPrefix="/process"
  />
