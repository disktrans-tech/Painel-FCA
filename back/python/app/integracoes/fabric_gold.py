"""
Acesso à gold do Microsoft Fabric (lakehouse `disktrans_gold`).

Ponto único de conexão: nenhum outro módulo do backend abre conexão
com o Fabric diretamente, todos chamam `consultar()` daqui. Autenticação
via Service Principal (Entra ID), sem usuário/senha pessoal; o controle
de acesso por tabela e por linha é feito do lado do Fabric (OneLake Data
Access Role), não em lógica deste módulo — ver docs/diretrizes-uso-datalake.md.

Se o projeto usar este módulo, registre a decisão em `docs/` (ex.:
`decisao-acesso-gold.md`, seguindo o modelo de `decisao-exemplo.md`) e
apague este comentário-modelo se não fizer sentido para o projeto.

Pool de conexões e cache do token seguem
docs/diretrizes-uso-datalake.md, seção 2.3: nunca abrir conexão
nova a cada chamada. Sobre segurança do cache: este módulo nunca lê,
loga ou guarda o valor do token em variável própria — quem cacheia o
token é o SDK oficial (`azure.identity`), só em memória do processo,
nunca em disco; nós só reaproveitamos a mesma instância de credencial
para o cache dele funcionar. Tudo aqui é privado ao módulo (prefixo
`_`) e nada é exposto por nenhum router.
"""

import queue
import random
import struct
import threading
import time
from contextlib import contextmanager

import pyodbc
from azure.identity import ClientSecretCredential

from app.config import configuracoes

_SQL_COPT_SS_ACCESS_TOKEN = 1256

# Throttling de capacidade do Fabric — retry com backoff exponencial,
# nunca retry imediato em loop (docs/diretrizes-uso-datalake.md, 2.3).
_MAX_TENTATIVAS = 4
_ESPERA_BASE_SEGUNDOS = 1.0
_MARCADORES_THROTTLING = ("toomanyrequestsforcapacity", "throttl")

# --- Credencial: uma instância só, reaproveitada entre chamadas -----
_credencial: ClientSecretCredential | None = None
_lock_credencial = threading.Lock()


def _obter_credencial() -> ClientSecretCredential:
    global _credencial
    if _credencial is None:
        with _lock_credencial:
            if _credencial is None:
                _credencial = ClientSecretCredential(
                    configuracoes.FABRIC_TENANT_ID,
                    configuracoes.FABRIC_CLIENT_ID,
                    configuracoes.FABRIC_CLIENT_SECRET,
                )
    return _credencial


# --- Pool de conexões -------------------------------------------------
_pool: "queue.Queue[pyodbc.Connection]" = queue.Queue(maxsize=configuracoes.FABRIC_POOL_MAX_CONEXOES)
_conexoes_criadas = 0
_lock_pool = threading.Lock()


def _criar_conexao() -> pyodbc.Connection:
    token = _obter_credencial().get_token("https://database.windows.net/.default")
    token_bytes = token.token.encode("utf-16-le")
    token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
    try:
        return pyodbc.connect(
            "Driver={ODBC Driver 18 for SQL Server};"
            f"Server={configuracoes.FABRIC_SQL_ENDPOINT},1433;"
            f"Database={configuracoes.FABRIC_SQL_DATABASE};"
            "Encrypt=yes;"
            "TrustServerCertificate=no;",
            attrs_before={_SQL_COPT_SS_ACCESS_TOKEN: token_struct},
        )
    finally:
        # O token só existe nestas variáveis locais, pelo tempo mínimo
        # necessário para abrir a conexão — não fica retido em nenhum
        # atributo de módulo, então não há o que um erro ou um dump de
        # memória do processo consiga expor além do já necessário para
        # a própria chamada de connect().
        del token_bytes, token_struct


@contextmanager
def obter_conexao():
    """
    Empresta uma conexão do pool (ou abre uma nova, respeitando o
    limite de `FABRIC_POOL_MAX_CONEXOES`) e devolve ao final — nunca
    abre uma conexão nova por chamada (docs/diretrizes-uso-datalake.md,
    seção 2.3).

    Uso:
        with obter_conexao() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("SELECT ...")
    """
    global _conexoes_criadas

    conexao: pyodbc.Connection | None = None
    try:
        conexao = _pool.get_nowait()
    except queue.Empty:
        with _lock_pool:
            if _conexoes_criadas < configuracoes.FABRIC_POOL_MAX_CONEXOES:
                conexao = _criar_conexao()
                _conexoes_criadas += 1
        if conexao is None:
            # Pool no limite combinado: espera uma conexão liberar em
            # vez de estourar o teto acordado com o time de dados.
            conexao = _pool.get()

    veio_bem = True
    try:
        yield conexao
    except Exception:
        veio_bem = False
        raise
    finally:
        if veio_bem:
            try:
                _pool.put_nowait(conexao)
            except queue.Full:
                conexao.close()
        else:
            # Estado da conexão após erro é incerto (transação aberta,
            # socket em condição estranha) — descarta em vez de
            # devolver ao pool.
            conexao.close()
            with _lock_pool:
                _conexoes_criadas -= 1


def _eh_erro_throttling(erro: Exception) -> bool:
    mensagem = str(erro).lower()
    return any(marcador in mensagem for marcador in _MARCADORES_THROTTLING)


def consultar(query: str, parametros: tuple = ()) -> list[dict]:
    """
    Executa uma consulta (sempre parametrizada — nunca concatenar valor
    do chamador na query) e devolve as linhas como lista de dicts.

    Se a tabela/linha não estiver liberada para este Service Principal
    na OneLake Data Access Role, o pyodbc levanta erro de permissão
    (SQLSTATE 42000) — deixe subir para o chamador tratar.

    Erro de throttling de capacidade do Fabric (equivalente ao
    `TooManyRequestsForCapacity`) tem retry automático com backoff
    exponencial — nunca retry imediato em loop
    (docs/diretrizes-uso-datalake.md, seção 2.3).
    """
    for tentativa in range(_MAX_TENTATIVAS):
        try:
            with obter_conexao() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(query, parametros)
                    colunas = [coluna[0] for coluna in cursor.description]
                    return [dict(zip(colunas, linha)) for linha in cursor.fetchall()]
        except pyodbc.Error as erro:
            ultima_tentativa = tentativa == _MAX_TENTATIVAS - 1
            if ultima_tentativa or not _eh_erro_throttling(erro):
                raise
            time.sleep(_ESPERA_BASE_SEGUNDOS * (2**tentativa) + random.uniform(0, 0.5))
