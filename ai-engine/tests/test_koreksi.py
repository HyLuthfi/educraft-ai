import pytest
import json
from unittest.mock import patch

def test_endpoint_koreksi_sukses(client):
    mock_student_response = """
    {
        "hasil": {
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
    }
    """
    
    # Mock panggilan Gemini di router.koreksi
    with patch("router.koreksi.panggil_ai", side_effect=[mock_student_response, "Rata-rata kelas sangat baik."]):
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
        assert "text/event-stream" in response.headers.get("content-type", "")

        events = []
        for line in response.text.split("\n"):
            line = line.strip()
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))

        event_types = [e.get("type") for e in events]
        assert "status" in event_types
        assert "hasil" in event_types
        assert "analitik" in event_types
        assert "done" in event_types

        hasil_event = next(e for e in events if e.get("type") == "hasil")
        assert hasil_event["data"]["nama_siswa"] == "Budi"
        assert hasil_event["data"]["nilai_akhir"] == "100"

def test_endpoint_koreksi_error_validasi(client):
    # Kirim payload kosong untuk memicu error 422
    response = client.post("/api/correct", json={})
    assert response.status_code == 422
