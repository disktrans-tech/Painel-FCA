"""
Acesso ao banco de dados (Postgres / Supabase).

Todo acesso ao banco passa por aqui — os routers nunca abrem conexão
diretamente. Isso mantém a query em um único lugar para revisar
segurança (SQL parametrizado, sem SELECT *, etc.).
"""

from contextlib import contextmanager

import psycopg2
import psycopg2.extras

from app.config import configuracoes


@contextmanager
def obter_conexao():
    """
    Abre e fecha a conexão de forma segura, mesmo se der erro no meio.

    Uso:
        with obter_conexao() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("SELECT ...")
    """
    conexao = psycopg2.connect(
        configuracoes.string_conexao_banco(),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    try:
        yield conexao
        conexao.commit()
    except Exception:
        conexao.rollback()
        raise
    finally:
        conexao.close()
