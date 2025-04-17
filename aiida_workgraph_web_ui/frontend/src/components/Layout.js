// src/components/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faProjectDiagram, faCogs, faDatabase, faLayerGroup, faRobot, faClock } from '@fortawesome/free-solid-svg-icons';
import './Layout.css'; // Import layout-specific styles

const Layout = ({ children }) => {
  return (
    <div className="App">
      <div className="sidebar">
        <nav>
          <ul>
          <li><Link to="/"><FontAwesomeIcon icon={faHome} /><span>Home</span></Link></li>
          <li><Link to="/workgraph"><FontAwesomeIcon icon={faProjectDiagram} /><span>WorkGraph</span></Link></li>
          <li><Link to="/process"><FontAwesomeIcon icon={faCogs} /><span>Process</span></Link></li>
          <li><Link to="/datanode"><FontAwesomeIcon icon={faDatabase} /><span>Data</span></Link></li>
          <li><Link to="/groupnode"><FontAwesomeIcon icon={faLayerGroup} /><span>Group</span></Link></li>
          <li><Link to="/daemon"><FontAwesomeIcon icon={faRobot} /><span>Daemon</span></Link></li>
          <li><Link to="/scheduler"><FontAwesomeIcon icon={faClock} /><span>Scheduler</span></Link></li>
          </ul>
        </nav>
      </div>
      <div className="content">
        {children} {/* This is where page-specific content will be rendered */}
      </div>
    </div>
  );
};

export default Layout;
