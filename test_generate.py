import urllib.request
import json

data = {
    "konten_materi": "Materi tentang sistem tata surya dan planet-planet. Matahari adalah pusat tata surya.",
    "config": {
        "blocks": [
            {
                "tipe": "Pilihan Ganda",
                "level": "LOTS",
                "count": 2,
                "image_count": 2
            }
        ],
        "level_bloom": "campuran",
        "mata_pelajaran": "IPA",
        "jenjang": "SD",
        "bahasa": "id",
        "instruksi_khusus": ""
    }
}

req = urllib.request.Request(
    "http://localhost:3000/api/generate", 
    data=json.dumps(data).encode('utf-8'),
    headers={
        "Content-Type": "application/json"
    }
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print(json.dumps(result, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
