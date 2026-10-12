"""
Modelos Pydantic — o formato dos dados que entram e saem da API.

Regra: cada endpoint retorna só os campos que a tela precisa (nunca
"SELECT *" disfarçado em JSON). Se a tela não exibe o campo, ele não
sai daqui — isso é minimização de dados pessoais (LGPD).
"""

from pydantic import BaseModel


class SaudeResposta(BaseModel):
    status: str
    ambiente: str
