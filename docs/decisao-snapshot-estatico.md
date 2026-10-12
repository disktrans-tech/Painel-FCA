# Decisão: painel estático com snapshot JSON (sem API em tempo real)

**Data:** 12/10/2026 · **Status:** aceita (piloto)

## Contexto

O painel precisa de um link que possa ser compartilhado com pessoas de dentro e de fora do
time, sem login. Ainda não existe Service Principal para este projeto no Data Lake.

## Decisão

- O frontend é estático, publicado no GitHub Pages a partir de `front/`.
- Os dados vêm de `front/data/trocas.json`, gerado por `back/scripts/atualizar_base.py`
  (consulta somente leitura `back/sql/base_trocas.sql`, com filtro de período e só as colunas usadas).
- O JSON não tem dado de cliente nem dado pessoal: só nome do atendimento, datas e status.

## Consequências

- Os números são uma foto do momento da extração (data exibida no topo do painel).
- A atualização é manual até existir uma Service Principal; com ela, um workflow agendado
  pode rodar o script respeitando a cadência do pipeline Gold (sem polling).
- Como o repositório e o Pages são públicos, qualquer pessoa com o link vê os números por
  concessionária/unidade. Se isso deixar de ser aceitável, mover para hospedagem com login.
