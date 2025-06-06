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
