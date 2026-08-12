import pytest
from unittest.mock import patch

def test_endpoint_koreksi_sukses(client):
    mock_response = """
    {
        "hasil": [
            {
                "nama_siswa": "Budi",
                "nilai_akhir": "100",
                "status_kelulusan": "tuntas",
                "detail_koreksi": [
                    {
                        "nomor": 1,
                        "pertanyaan": "Siapa presiden pertama Indonesia?",
                        "jawaban_siswa": "Soekarno",
                        "kunci_jawaban": "Soekarno",
                        "status": "benar",
                        "nilai": 1.0,
                        "catatan": "Jawaban benar"
                    }
                ],
                "rekomendasi": "Pertahankan prestasi"
            }
        ],
        "analitik_kelas": "Rata-rata kelas sangat baik."
    }
    """
    
    # Mock panggilan Gemini di router.koreksi
    with patch("router.koreksi.panggil_gemini", return_value=mock_response):
        payload = {
            "soalText": "1. Siapa presiden pertama Indonesia? Kunci: Soekarno",
            "students": [
                {
                    "id": "s1",
                    "name": "Budi",
                    "textContent": "1. Soekarno"
                }
            ],
            "config": {
                "bobotBenar": 1,
                "bobotSalah": 0,
                "skala": "100",
                "kkm": 75
            }
        }
        
        response = client.post("/api/correct", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "hasil" in data
        assert len(data["hasil"]) == 1
        assert data["hasil"][0]["nama_siswa"] == "Budi"
        assert data["hasil"][0]["nilai_akhir"] == "100"
        assert data["analitik_kelas"] == "Rata-rata kelas sangat baik."

def test_endpoint_koreksi_error_validasi(client):
    # Kirim payload kosong untuk memicu error 422
    response = client.post("/api/correct", json={})
    assert response.status_code == 422
