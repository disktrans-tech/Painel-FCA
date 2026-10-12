"""
Router de exemplo — copie este padrão para os endpoints reais do projeto
e delete este arquivo quando não precisar mais dele.

Convenções:
- Regra de negócio e verificação de permissão ficam AQUI (backend),
  nunca no frontend.
- Toda entrada de usuário é validada pelo Pydantic (schemas.py).
- Toda query ao banco é parametrizada (nunca concatenar string em SQL).
"""

from fastapi import APIRouter

from app.config import configuracoes
from app.schemas import SaudeResposta

router = APIRouter(prefix="/api", tags=["exemplo"])


@router.get("/saude", response_model=SaudeResposta)
async def verificar_saude() -> SaudeResposta:
    """Endpoint simples só para o frontend confirmar que a API está no ar."""
    return SaudeResposta(status="ok", ambiente=configuracoes.AMBIENTE)


# Exemplo de endpoint que consultaria o banco — descomente e adapte:
#
# from app.database import obter_conexao
#
# @router.get("/exemplo-consulta")
# async def exemplo_consulta():
#     with obter_conexao() as conexao:
#         with conexao.cursor() as cursor:
#             cursor.execute("SELECT id, nome FROM exemplo_tabela LIMIT 50")
#             linhas = cursor.fetchall()
#     return linhas
