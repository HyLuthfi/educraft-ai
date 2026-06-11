import pytest
from router.parse_file import bersihkan_teks

def test_bersihkan_teks_menghapus_spasi_berlebih():
    input_teks = "Ini   adalah      teks dengan    banyak spasi."
    hasil = bersihkan_teks(input_teks)
    assert hasil == "Ini adalah teks dengan banyak spasi."

def test_bersihkan_teks_menghapus_baris_kosong_berlebih():
    input_teks = "Baris 1\n\n\n\nBaris 2\n\n\nBaris 3"
    hasil = bersihkan_teks(input_teks)
    assert hasil == "Baris 1\n\nBaris 2\n\nBaris 3"

def test_bersihkan_teks_menghapus_spasi_di_awal_akhir():
    input_teks = "   Teks yang kotor   \n  di pinggir  "
    hasil = bersihkan_teks(input_teks)
    assert hasil == "Teks yang kotor\ndi pinggir"

def test_endpoint_parse_file_tanpa_file(client):
    response = client.post("/api/parse-file")
    assert response.status_code == 422

def test_endpoint_parse_file_tipe_tidak_valid(client):
    file_content = b"Ini adalah konten teks biasa."
    files = {"file": ("test.txt", file_content, "text/plain")}
    response = client.post("/api/parse-file", files=files)
    assert response.status_code == 400
    assert "Tipe file tidak didukung" in response.json()["detail"]
