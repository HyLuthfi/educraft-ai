import pytest
from unittest.mock import patch

def test_endpoint_ai_search_sukses(client):
    mock_response = '''
    {
        "judul": "Fotosintesis pada Tumbuhan",
        "materi": "Fotosintesis adalah proses di mana tumbuhan membuat makanannya sendiri...",
        "poin_utama": ["Cahaya matahari", "Klorofil", "Air", "Karbon Dioksida"],
        "sumber_referensi": ["Buku Biologi SMA Kelas X"]
    }
    '''
    
    with patch("router.ai_search.panggil_groq", return_value=mock_response):
        payload = {
            "topik": "Fotosintesis",
            "jenjang": "SMA",
            "mata_pelajaran": "Biologi",
            "kedalaman": "medium"
        }
        
        response = client.post("/api/ai-search", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["judul"] == "Fotosintesis pada Tumbuhan"
        assert len(data["poin_utama"]) == 4

def test_endpoint_ai_search_error_validasi(client):
    payload = {
        "topik": "Ab"
    }
    response = client.post("/api/ai-search", json=payload)
    assert response.status_code == 422
