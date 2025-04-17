import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import NodeTable from './components/NodeTable'; // ✅ import the generic table
import DataNodeTable from './components/DataNodeTable';
import WorkGraphItem from './components/WorkGraphItem';
import DataNodeItem from './components/DataNodeItem';
import Daemon from './components/Daemon';
import SchedulerList from './components/SchedulerList';
import SchedulerDetail from './components/SchedulerDetail';
import Layout from './components/Layout'; // Import the Layout component

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Layout> {/* Wrap the routes with the Layout component */}
          <Routes>
            <Route
              path="/workgraph"
              element={
                <NodeTable
                  title="WorkGraph"
                  endpointBase="http://localhost:8000/api/workgraph"
                  linkPrefix="/workgraph"
                />
              }
            />
            <Route
              path="/process"
              element={
                <NodeTable
                  title="Process"
                  endpointBase="http://localhost:8000/api/process"
                  linkPrefix="/process"
                />
              }
            />
            <Route path="/datanode" element={<DataNodeTable />} />
            <Route path="/daemon" element={<Daemon />} />
            <Route path="/scheduler" element={<SchedulerList />} />
            <Route path="/scheduler/:name" element={<SchedulerDetail />} />
            <Route path="/" element={<Home />} />
            <Route path="/workgraph/:pk/*" element={<WorkGraphItem />} />
            <Route path="/datanode/:pk" element={<DataNodeItem />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
