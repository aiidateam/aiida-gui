// tell TS about our extra window props
declare global {
  interface Window {
    React: typeof import("react");
    ReactDOM: typeof import("react-dom");
    ReactRouterDOM: typeof import("react-router-dom");
  }
}

// this file is a module because of the `export {}` below
export {};
