import { useState, useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import DataNodeTable from "./components/DataNodeTable";
import GroupNodeTable from "./components/GroupNodeTable";
import GroupNodeDetail from "./components/GroupNodeDetail";
import { ProcessTable } from "./components/ProcessTable";
import ProcessNodeDetail from "./components/ProcessItem";
import WorkFlowItem from "./components/WorkFlowItem";
import DataNodeItem from "./components/DataNodeItem";
import Daemon from "./components/Daemon";
import Layout from "./components/Layout";
import hostComponents from "./HostComponents";

import { PluginProvider, usePluginContext } from "./components/PluginContext";
import "./assets/scss/app.scss";

function NotFound() {
  return <div>Sorry, that page does not exist.</div>;
}

interface AppContentProps {
  error: Error | null;
}

function AppContent({ error }: AppContentProps) {
  const { routes } = usePluginContext();

  return (
    <Layout>
      {error ? (
        <div style={{ color: "red" }}>
          Error loading plugins: {error.message}
        </div>
      ) : null}

      <Suspense fallback={<div>Loading page...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/process" element={<ProcessTable />} />
          <Route path="/process/:pk/*" element={<ProcessNodeDetail />} />
          <Route path="/daemon" element={<Daemon />} />
          <Route
            path="/workchain/:pk/*"
            element={<WorkFlowItem endPoint="/api/workchain" />}
          />
          <Route path="/datanode" element={<DataNodeTable />} />
          <Route path="/datanode/:pk" element={<DataNodeItem />} />
          <Route path="/groupnode" element={<GroupNodeTable />} />
          <Route path="/groupnode/:pk" element={<GroupNodeDetail />} />

          {Object.entries(routes).map(([fullPath, PluginComponent]) => {
            const relative = fullPath.replace(/^\//, "");
            return (
              <Route
                key={fullPath}
                path={relative}
                element={<PluginComponent {...hostComponents} />}
              />
            );
          })}

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const [pluginNames, setPluginNames] = useState<string[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/plugins")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ plugins?: string[] }>;
      })
      .then((data) => setPluginNames(data.plugins ?? []))
      .catch((loadError: Error) => {
        console.error("Failed to load plugin list:", loadError);
        setError(loadError);
        setPluginNames([]);
      });
  }, []);

  if (pluginNames === null) {
    return <div>Loading plugin list...</div>;
  }

  return (
    <Router>
      <PluginProvider pluginNames={pluginNames}>
        <AppContent error={error} />
      </PluginProvider>
    </Router>
  );
}
