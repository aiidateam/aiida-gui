# Welcome to AiiDA WorkGraph Web UI!
[![PyPI version](https://badge.fury.io/py/aiida-workgraph-web-ui.svg)](https://badge.fury.io/py/aiida-workgraph-web-ui)
[![Docs status](https://readthedocs.org/projects/aiida-workgraph-web-ui/badge)](http://aiida-workgraph-web-ui.readthedocs.io/)
[![Unit test](https://github.com/aiidateam/aiida-workgraph-web-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/aiidateam/aiida-workgraph-web-ui/actions/workflows/ci.yml)


Web UI to visualize and manage the AiiDA WorkGraph.

## Frontend
Use `rete-kit` to create the frontend, using `react`

```console
npm i -g rete-kit
rete-kit frontend
```
### Run
```console
npm start
```

### Build
Build frontend application so that it generates static files (HTML, CSS, JavaScript, etc.).
```console
npm run build
```
This typically creates a build directory with all the static files needed to deploy the frontend.

### Include Frontend Build in the Package
Now, ensure these static files are included in the Python package. The [tool.setuptools.package_data] in the pyproject.toml should be set to include these files.

```toml
[tool.setuptools.package_data]
your_package_name = ["path/to/frontend/build/*"]
```

## Backend
Use `FastAPI`

The documentation page is `http://localhost:8000/docs`.
