# Welcome to AiiDA GUI!

[![PyPI version](https://badge.fury.io/py/aiida-gui.svg)](https://badge.fury.io/py/aiida-gui)
[![Docs status](https://readthedocs.org/projects/aiida-gui/badge)](http://aiida-gui.readthedocs.io/)
[![Unit test](https://github.com/aiidateam/aiida-gui/actions/workflows/ci.yml/badge.svg)](https://github.com/aiidateam/aiida-gui/actions/workflows/ci.yml)

Web UI to visualize and manage the AiiDA WorkGraph.

## Installation

```bash
pip install aiida-gui
```

## Usage

Start the AiiDA GUI server with the following command:

```bash
aiida-gui start
```

By default, the GUI runs on `http://localhost:3000` and targets the AiiDA REST API at `http://127.0.0.1:8000/v0`.

You can override both at startup, for example:

```bash
aiida-gui start --port 3100 --restapi-base-url http://127.0.0.1:8001 --restapi-prefix /v0
```

The GUI always binds to localhost (`127.0.0.1`).

Stop the AiiDA GUI server with the following command:

```bash
aiida-gui stop
```
