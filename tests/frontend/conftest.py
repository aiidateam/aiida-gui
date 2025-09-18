import pytest
from playwright.sync_api import sync_playwright
from playwright.sync_api import expect

from aiida.engine import run_get_node
from aiida.workflows.arithmetic.multiply_add import MultiplyAddWorkChain
import uvicorn

from multiprocessing import Process, Value

import contextlib
import threading
import time
import os
import socket
import errno


################################
# Utilities for frontend tests #
################################


class UvicornTestServer(uvicorn.Server):
    """
    Suggested way to start a server in a background by developers
    https://github.com/encode/uvicorn/discussions/1103#discussioncomment-941726
    """

    def install_signal_handlers(self):
        pass

    @contextlib.contextmanager
    def run_in_thread(self):
        thread = threading.Thread(target=self.run)
        thread.start()
        try:
            print("wait for started")
            while not self.started:
                time.sleep(1e-3)
            yield
        finally:
            self.should_exit = True
            thread.join()


def run_uvicorn_web_server(
    web_server_started, stop_web_server, **uvicorn_configuration
):
    config = uvicorn.Config(**uvicorn_configuration)
    uvicorn_web_server = UvicornTestServer(config=config)
    with uvicorn_web_server.run_in_thread():
        with web_server_started.get_lock():
            web_server_started.value = 1
        print("Wait for signal to stop web server.")
        while not stop_web_server.value:
            time.sleep(1e-3)


###############################
# Fixtuers for frontend tests #
###############################


@pytest.fixture(scope="module")
def aiida_profile(aiida_config, aiida_profile_factory):
    """Create and load a profile with RabbitMQ as broker for frontend tests."""
    with aiida_profile_factory(aiida_config, broker_backend="core.rabbitmq") as profile:
        yield profile


@pytest.fixture(scope="module")
def set_backend_server_settings(aiida_profile):
    os.environ["AIIDA_GUI_PROFILE"] = aiida_profile.name


@pytest.fixture
def ran_workchain(
    aiida_profile,
    add_code,
):
    """A workgraph with calcfunction."""
    result, node = run_get_node(MultiplyAddWorkChain, x=2, y=3, z=4, code=add_code)
    return node


@pytest.fixture(scope="module")
def uvicorn_configuration():
    return {
        "app": "aiida_gui.app.api:app",
        "host": "127.0.0.1",
        "port": 8000,
        "log_level": "info",
        "workers": 2,
    }


@pytest.fixture(scope="module")
def web_server(set_backend_server_settings, uvicorn_configuration):
    from ctypes import c_int8

    web_server_started = Value(c_int8, 0)
    stop_web_server = Value(c_int8, 0)

    test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    port = uvicorn_configuration["port"]
    try:
        test_socket.bind(("localhost", port))
    except socket.error as err:
        if err.errno == errno.EADDRINUSE:
            raise RuntimeError(
                f"Port {port} is already in use. Please unbind the port, "
                "so we can start a web server for the tests."
            )
        else:
            raise err

    test_socket.close()

    web_server_proc = Process(
        target=run_uvicorn_web_server,
        args=(web_server_started, stop_web_server),
        kwargs=uvicorn_configuration,
    )

    web_server_proc.start()

    print("Wait for server being started.")
    while not web_server_started.value:
        time.sleep(1e-3)

    print("Web server started.")
    yield web_server_proc

    with stop_web_server.get_lock():
        stop_web_server.value = 1

    web_server_proc.join()
    web_server_proc.close()
    print("Web server stopped.")


# Define a fixture for the browser
@pytest.fixture(scope="module")
def browser():
    pytest_playwright_headless = os.environ.get("PYTEST_PLAYWRIGHT_HEADLESS", "yes")
    if pytest_playwright_headless == "yes":
        headless = True
    elif pytest_playwright_headless == "no":
        headless = False
    else:
        raise ValueError(
            f"Found environment variable PYTEST_PLAYWRIGHT_HEADLESS={pytest_playwright_headless}, "
            'please use "yes" or "no"'
        )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        yield browser
        browser.close()


# Define a fixture for the page
@pytest.fixture(scope="module")
def page(browser):
    with browser.new_context(base_url="http://localhost:8000") as context:
        # open a new tab/page in that context
        with context.new_page() as page:
            page.set_default_timeout(5_000)
            page.set_default_navigation_timeout(5_000)
            expect.set_options(timeout=5_000)
            yield page
