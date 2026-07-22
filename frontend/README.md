# AiiDA GUI Frontend

This frontend uses Vite, React, and TypeScript.

## Scripts

Run these commands from this folder:

- npm install: install dependencies
- npm start: start local development server
- npm run test: run Vitest unit/component tests once
- npm run test:watch: run Vitest in watch mode
- npm run test:coverage: run Vitest with coverage report
- npm run build:frontend: produce production frontend bundle
- npm run build: build and copy assets to aiida_gui/static

## Testing Strategy

The project intentionally keeps two frontend test layers:

- JavaScript tests (Vitest): fast unit and component tests for UI logic, rendering behavior, hooks, and interactions under frontend/src.
- Python tests (Playwright): browser-level end-to-end integration tests under tests/frontend that validate real backend + frontend behavior.

Use both layers. Vitest catches regressions quickly during frontend development, while Playwright validates full-stack user workflows.
