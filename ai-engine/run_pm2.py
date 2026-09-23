import uvicorn
import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8002"))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run("main:app", host=host, port=port, reload=False)
