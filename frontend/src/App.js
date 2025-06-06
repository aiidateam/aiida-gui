import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import DataNodeTable from './components/DataNodeTable';
import GroupNodeTable from './components/GroupNodeTable';
import GroupNodeDetail from './components/GroupNodeDetail';
import { ProcessTable } from './components/ProcessTable';
import ProcessNodeDetail from './components/ProcessItem';
import WorkChainItem from './components/WorkChainItem';
import DataNodeItem from './components/DataNodeItem';
import Daemon from './components/Daemon';
import Layout from './components/Layout'; // Import the Layout component

import './App.css';
import { im } from 'mathjs';

function App() {
  return (
    <Router>
      <div className="App">
        <Layout> {/* Wrap the routes with the Layout component */}
          <Routes>
            <Route path="/process" element={<ProcessTable />} />
            <Route path="/process/:pk/*" element={<ProcessNodeDetail />} />
            <Route path="/daemon" element={<Daemon />} />
            <Route path="/" element={<Home />} />
            <Route path="/workchain/:pk/*" element={<WorkChainItem />} />
            <Route path="/datanode" element={<DataNodeTable />} />
            <Route path="/datanode/:pk" element={<DataNodeItem />} />
            <Route path="/groupnode" element={<GroupNodeTable />} />
            <Route path="/groupnode/:pk" element={<GroupNodeDetail />} />
            </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
