import uvicorn
from fastapi import FastAPI
from src.interfaces.http.router import router as verification_router

app = FastAPI(title="Fire Detection Server AI")

app.include_router(verification_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)