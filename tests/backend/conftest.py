import pytest
from fastapi.testclient import TestClient
import os


@pytest.fixture(scope="module")
def set_backend_server_settings(aiida_profile):
    os.environ["AIIDA_GUI_PROFILE"] = aiida_profile.name


@pytest.fixture(scope="module")
def client(set_backend_server_settings):
    from aiida_gui.app.api import app

    return TestClient(app)
