import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faCogs,
  faDatabase,
  faLayerGroup,
  faRobot,
} from "@fortawesome/free-solid-svg-icons";
import type { ReactNode } from "react";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { usePluginContext } from "./PluginContext";
import "../assets/scss/layout.scss";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { sideBarItems } = usePluginContext();

  return (
    <div className="App">
      <div className="sidebar">
        <nav>
          <ul>
            <li>
              <Link to="/">
                <FontAwesomeIcon icon={faHome} />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link to="/process">
                <FontAwesomeIcon icon={faCogs} />
                <span>Process</span>
              </Link>
            </li>
            <li>
              <Link to="/datanode">
                <FontAwesomeIcon icon={faDatabase} />
                <span>Data</span>
              </Link>
            </li>
            <li>
              <Link to="/groupnode">
                <FontAwesomeIcon icon={faLayerGroup} />
                <span>Group</span>
              </Link>
            </li>
            <li>
              <Link to="/daemon">
                <FontAwesomeIcon icon={faRobot} />
                <span>Daemon</span>
              </Link>
            </li>
            {Object.entries(sideBarItems).map(([name, item]) => (
              <li key={name}>
                <Link to={item.path}>
                  {item.icon ? (
                    <FontAwesomeIcon icon={item.icon as IconProp} />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
