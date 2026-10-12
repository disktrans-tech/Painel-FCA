"""
Configuração da aplicação — lê tudo de variáveis de ambiente (.env local
ou variáveis do serviço em produção). Nenhum valor sensível fica
hardcoded neste arquivo nem em nenhum outro.
"""

import os

from dotenv import load_dotenv

load_dotenv()  # carrega o .env quando roda localmente; em produção as
                # variáveis já vêm do ambiente do serviço de deploy.


def _obrigatorio(nome: str) -> str:
    valor = os.getenv(nome)
    if not valor:
        raise RuntimeError(
            f"Variável de ambiente '{nome}' não configurada. "
            f"Copie .env.example para .env e preencha os valores."
        )
    return valor


class Configuracoes:
    AMBIENTE: str = os.getenv("AMBIENTE", "local")

    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_CORS_ORIGINS: list[str] = [
        origem.strip()
        for origem in os.getenv("API_CORS_ORIGINS", "http://localhost:5500").split(",")
        if origem.strip()
    ]

    # String de conexão com o banco. Aceita DATABASE_URL pronta OU as
    # variáveis separadas (DB_HOST, DB_PORT, etc.) — o que estiver preenchido.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_HOST: str = os.getenv("DB_HOST", "")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "")
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    @classmethod
    def string_conexao_banco(cls) -> str:
        if cls.DATABASE_URL:
            return cls.DATABASE_URL
        return (
            f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}"
            f"@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        )


configuracoes = Configuracoes()
