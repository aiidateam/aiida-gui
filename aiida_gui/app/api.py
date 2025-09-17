from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from aiida.manage import manager
from aiida_gui.app.workchain import router as workchain_router
from aiida_gui.app.task import router as task_router
from aiida_gui.app.process_node import router as process_router
from aiida_gui.app.daemon import router as daemon_router
from aiida_gui.app.data_node import router as datanode_router
from aiida_gui.app.group_node import router as groupnode_router
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

from fastapi.responses import FileResponse
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException

from pydantic_settings import BaseSettings
from aiida_gui.app.plugin import get_plugins, mount_plugins


class BackendSettings(BaseSettings):
    """
    Settings can be set by setting the environment variables in upper case.
    For example for setting `aiida_gui_profile` one has to export
    the evironment variable `AIIDA_GUI_PROFILE`.
    """

    aiida_gui_profile: str = ""  # if empty aiida uses default profile


backend_settings = BackendSettings()

app = FastAPI()
manager.get_manager().load_profile(backend_settings.aiida_gui_profile)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.get("/api", tags=["root"])
async def read_root() -> dict:
    return {"message": "Welcome to AiiDA."}


@app.get("/plugins")
async def list_plugins():
    plugins = get_plugins()
    print(f"Found plugins: {plugins.keys()}")
    plugin_names = [plugin_name for plugin_name in plugins.keys()]
    return {"plugins": plugin_names}


app.include_router(workchain_router)
app.include_router(task_router)
app.include_router(process_router)
app.include_router(datanode_router)
app.include_router(groupnode_router)
app.include_router(daemon_router)
mount_plugins(app)


@app.get("/debug")
async def debug() -> dict:
    return {"loaded_aiida_profile": manager.get_manager().get_profile()}


@app.get("/backend-setting")
async def backend_settings():
    return backend_settings


# Integrating React build into a FastAPI application and serving the build (HTML, CSS, JavaScript) as static files
"""
When navigate to http://127.0.0.1:8000/settings from http://127.0.0.1:8000/ using client-side
routing (i.e., links within your React app), the React Router handles the route /settings
without reloading the page from the server. This is why it works.
However, when you refresh the page at http://127.0.0.1:8000/settings, the browser makes
a request to the FastAPI server for /settings. Since this route isn't defined in FastAPI
(it's a client-side route), the server returns a 404 Not Found error.
so we use the index.html serve all routes except API specific ones, then load all static assets.
"""
backend_dir = Path(__file__).parent
build_dir = backend_dir / "../static"
build_dir = os.getenv("REACT_BUILD_DIR", build_dir)


@app.exception_handler(StarletteHTTPException)
async def _spa_server(req: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return FileResponse(f"{build_dir}/index.html", media_type="text/html")
    else:
        return await http_exception_handler(req, exc)


if os.path.isdir(build_dir):
    app.mount(
        "/static/",
        StaticFiles(directory=build_dir / "static"),
        name="React app static files",
    )

    @app.get("/react-shim.js", include_in_schema=False)
    async def react_shim():
        path = build_dir / "react-shim.js"
        if not path.is_file():
            raise StarletteHTTPException(status_code=404, detail="shim missing")
        return FileResponse(path, media_type="application/javascript")

    @app.get("/react-jsx-runtime-shim.js", include_in_schema=False)
    async def react_jsx_runtime_shim():
        return FileResponse(
            build_dir / "react-jsx-runtime-shim.js", media_type="application/javascript"
        )

    @app.get("/react-router-dom-shim.js", include_in_schema=False)
    async def react_router_dom_shim():
        path = build_dir / "react-router-dom-shim.js"
        if not path.is_file():
            raise StarletteHTTPException(status_code=404, detail="shim missing")
        return FileResponse(path, media_type="application/javascript")

    @app.get("/use-sync-external-store-shim.js", include_in_schema=False)
    async def use_sync_external_store_shim():
        path = build_dir / "use-sync-external-store-shim.js"
        if not path.is_file():
            raise StarletteHTTPException(status_code=404, detail="shim missing")
        return FileResponse(path, media_type="application/javascript")
