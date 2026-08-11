import pytest
from fastapi.testclient import TestClient
from main import app, API_KEY

@pytest.fixture
def client():
    app.dependency_overrides = {}
    
    return TestClient(app, headers={"X-API-Key": API_KEY})
