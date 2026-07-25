import traceback

from fastapi.staticfiles import StaticFiles
from starlette.routing import Mount, Route


def get_plugins():
    import importlib.metadata

    plugins = {}

    try:
        eps = importlib.metadata.entry_points()
        eps = eps.select(group='aiida_gui.plugins')
    except Exception:
        print('Failed to get entry points')
        return plugins

    for entry in eps:
        plugin_name = entry.name
        try:
            plugin_module = entry.load()
            plugins[plugin_name] = plugin_module
        except Exception as e:
            print(traceback.format_exc())
            print(f'Failed to load plugin {plugin_name}: {e}')
            continue

    return plugins


def mount_plugins(app):
    plugins = get_plugins()
    for plugin_name, plugin_module in plugins.items():
        sub_apps = plugin_module.get('sub_apps', {})
        routers = plugin_module.get('routers', {})
        static_dirs = plugin_module.get('static_dirs', {})

        for key, sub_app in sub_apps.items():
            app.mount(f'/plugins/{plugin_name}/{key}', sub_app, name=f'plugin_{plugin_name}')

        for key, router in routers.items():
            app.include_router(router, prefix=f'/plugins/{key}')

        for key, static_dir in static_dirs.items():
            app.mount(
                f'/plugins/{key}/static',
                StaticFiles(directory=static_dir, html=True),
                name=f'plugin_{key}',
            )


def list_routes_and_statics(app, prefix: str = ''):
    for route in app.routes:
        if isinstance(route, Mount) and isinstance(route.app, StaticFiles):
            print(f'[static] {prefix}{route.path}  → serves from {route.app.directory!r}')
        elif isinstance(route, Mount):
            sub_prefix = prefix + route.path
            try:
                # recurse into the sub-app's routes
                list_routes_and_statics(route.app, prefix=sub_prefix)
            except Exception:
                pass
        elif isinstance(route, Route):
            methods = ','.join(route.methods or [])
            print(f'[route ] {prefix}{route.path}  [{methods}]')
