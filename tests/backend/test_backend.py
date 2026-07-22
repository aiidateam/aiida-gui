import pytest


@pytest.mark.backend
def test_root_route(client):
    """Sample test case for the root route"""
    response = client.get("/api")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to AiiDA."}


@pytest.mark.backend
def test_workgraph_route(client):
    """Sample test case for the root route"""
    response = client.get("/api/workchain-data")
    assert response.status_code == 200


@pytest.mark.backend
def test_frontend_root_without_assets(client):
    """Root endpoint returns a helpful error when frontend assets are missing."""
    response = client.get("/")
    assert response.status_code == 503
    assert "frontend assets are missing" in response.json()["detail"].lower()
