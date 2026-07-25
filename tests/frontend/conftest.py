import errno
import os
import socket
import time
import traceback
from multiprocessing import get_context

import pytest
import uvicorn
from aiida.engine import run_get_node
from aiida.orm import load_code, load_node
from aiida.workflows.arithmetic.multiply_add import MultiplyAddWorkChain
from playwright.sync_api import expect

DEFAULT_PLAYWRIGHT_TIMEOUT_MS = int(os.environ.get('PYTEST_PLAYWRIGHT_TIMEOUT_MS', '15000'))


def create_workchain_node(profile_name: str, code_pk: int, queue):
    """Create a workchain in a separate process and return the created node PK."""
    try:
        from aiida import load_profile

        load_profile(profile_name)
        code = load_code(code_pk)
        _, node = run_get_node(MultiplyAddWorkChain, x=2, y=3, z=4, code=code)
        queue.put({'ok': True, 'pk': node.pk})
    except Exception:  # pragma: no cover - defensive path for subprocess failures
        queue.put({'ok': False, 'traceback': traceback.format_exc()})


def run_uvicorn_web_server(**uvicorn_configuration):
    """Run the uvicorn web server in a dedicated process.

    Running uvicorn directly in this process avoids running event loops from
    non-main threads, which is problematic with newer async backends.
    """
    uvicorn.run(**uvicorn_configuration)


def wait_for_server(host: str, port: int, timeout: float = 30.0) -> None:
    """Wait until the TCP port is accepting connections."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as test_socket:
            test_socket.settimeout(0.5)
            if test_socket.connect_ex((host, port)) == 0:
                return
        time.sleep(0.1)

    msg = f'Web server at {host}:{port} did not become ready within {timeout} seconds.'
    raise RuntimeError(msg)


###############################
# Fixtures for frontend tests #
###############################


@pytest.fixture(scope='session')
def aiida_profile(aiida_config, aiida_profile_factory):
    """Create and load a profile with RabbitMQ as broker for frontend tests."""
    with aiida_profile_factory(aiida_config, broker_backend='core.rabbitmq') as profile:
        yield profile


@pytest.fixture(scope='session')
def set_backend_server_settings(aiida_profile):
    os.environ['AIIDA_GUI_PROFILE'] = aiida_profile.name


@pytest.fixture(scope='session')
def ran_workchain(aiida_profile, add_code):
    """A workgraph with calcfunction."""
    mp_context = get_context('spawn')
    queue = mp_context.Queue()
    process = mp_context.Process(
        target=create_workchain_node,
        args=(aiida_profile.name, add_code.pk, queue),
    )

    process.start()
    process.join(timeout=120)

    if process.is_alive():
        process.terminate()
        process.join(timeout=10)
        msg = 'Timed out while creating test workchain in subprocess.'
        raise RuntimeError(msg)

    if process.exitcode != 0:
        msg = f'Workchain subprocess exited with code {process.exitcode}.'
        raise RuntimeError(msg)

    result = queue.get_nowait()
    if not result.get('ok', False):
        msg = 'Failed to create test workchain:\n' + result.get('traceback', 'unknown error')
        raise RuntimeError(msg)

    return load_node(result['pk'])


@pytest.fixture(scope='session')
def uvicorn_configuration():
    return {
        'app': 'aiida_gui.app.api:app',
        'host': '127.0.0.1',
        'port': 8000,
        'log_level': 'info',
        'workers': 1,
    }


@pytest.fixture(scope='session')
def web_server(set_backend_server_settings, uvicorn_configuration):
    test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    port = uvicorn_configuration['port']
    host = uvicorn_configuration['host']
    try:
        test_socket.bind((host, port))
    except OSError as err:
        if err.errno == errno.EADDRINUSE:
            raise RuntimeError(
                f'Port {port} is already in use. Please unbind the port, so we can start a web server for the tests.'
            )
        raise

    test_socket.close()

    mp_context = get_context('spawn')
    web_server_proc = mp_context.Process(
        target=run_uvicorn_web_server,
        kwargs=uvicorn_configuration,
    )

    web_server_proc.start()
    wait_for_server(host, port)

    print('Web server started.')
    yield web_server_proc

    web_server_proc.terminate()
    web_server_proc.join(timeout=10)
    if web_server_proc.is_alive():
        web_server_proc.kill()
        web_server_proc.join(timeout=5)
    web_server_proc.close()
    print('Web server stopped.')


@pytest.fixture(scope='session')
def browser_type_launch_args(browser_type_launch_args):
    """Configure launch options for pytest-playwright browser fixture."""
    pytest_playwright_headless = os.environ.get('PYTEST_PLAYWRIGHT_HEADLESS', 'yes')
    if pytest_playwright_headless == 'yes':
        headless = True
    elif pytest_playwright_headless == 'no':
        headless = False
    else:
        raise ValueError(
            f'Found environment variable PYTEST_PLAYWRIGHT_HEADLESS={pytest_playwright_headless}, '
            'please use "yes" or "no"'
        )

    return {
        **browser_type_launch_args,
        'headless': headless,
    }


@pytest.fixture(scope='session')
def browser_context_args(browser_context_args):
    """Set a base URL for page.goto("") and relative navigation."""
    return {
        **browser_context_args,
        'base_url': 'http://localhost:8000',
    }


@pytest.fixture(autouse=True)
def configure_page(page, web_server):
    """Apply common page timeout options for frontend browser tests."""
    page.set_default_timeout(DEFAULT_PLAYWRIGHT_TIMEOUT_MS)
    page.set_default_navigation_timeout(DEFAULT_PLAYWRIGHT_TIMEOUT_MS)
    expect.set_options(timeout=DEFAULT_PLAYWRIGHT_TIMEOUT_MS)
    yield
