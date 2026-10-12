"""
Ponto de entrada da API.

Rodar localmente (sempre dentro do venv — ver README.md):
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import configuracoes
from app.routers import exemplo

app = FastAPI(title="API do Projeto", version="0.1.0")

# CORS: só as origens explicitamente listadas em API_CORS_ORIGINS podem chamar
# esta API a partir do navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracoes.API_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exemplo.router)


@app.get("/")
async def raiz():
    return {"mensagem": "API no ar. Veja /docs para a documentação interativa."}
