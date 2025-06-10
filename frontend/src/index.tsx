import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as RRDOM from 'react-router-dom';

// Expose React and ReactDOM as globals so plugin bundles can find them
if (typeof window !== "undefined") {
  window.React = React;
  window.ReactDOM = ReactDOM;
  window.ReactRouterDOM = RRDOM;
}


const root = createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
