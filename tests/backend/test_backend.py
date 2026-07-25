import pytest
from fastapi.testclient import TestClient


@pytest.mark.backend
def test_root_route(client):
    """Sample test case for the root route"""
    response = client.get('/api')
    assert response.status_code == 200
    assert response.json() == {'message': 'Welcome to AiiDA.'}


@pytest.mark.backend
def test_workflow_route(client):
    """Sample test case for the root route"""
    response = client.get('/api/workchain-data')
    assert response.status_code == 200


@pytest.mark.backend
def test_frontend_root_without_assets(monkeypatch, tmp_path):
    """Simulate missing frontend assets and validate the returned help message."""
    import importlib

    empty_build = tmp_path / 'empty_build'
    empty_build.mkdir()
    monkeypatch.setenv('REACT_BUILD_DIR', str(empty_build))

    from aiida_gui.app import api as api_module

    api_module = importlib.reload(api_module)

    with TestClient(api_module.app) as local_client:
        response = local_client.get('/')

    assert response.status_code == 503
    assert 'frontend assets are missing' in response.json()['detail'].lower()
