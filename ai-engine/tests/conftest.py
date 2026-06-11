import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    app.dependency_overrides = {}
    
    return TestClient(app, headers={"X-API-Key": "dev-key-educraft"})
