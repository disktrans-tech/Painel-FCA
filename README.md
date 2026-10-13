# Painel FCA · Trocas

| Campo | Valor |
|---|---|
| Área responsável | Pós-venda / Customer Success |
| Dono do projeto | Jaqueline |
| Status | piloto |
| Registro no SharePoint | *(preencher)* |
| Link de produção | https://disktrans-tech.github.io/Painel-FCA/ |
| Backend / dados | Python: extração somente leitura do Data Lake (`disktrans_gold`) |
| Frontend | HTML/CSS/JS puro (GitHub Pages) |

## O que este projeto faz

Painel de acompanhamento do FCA de trocas: backlog de trocas em aberto × entregues por
atendimento (concessionária / unidade Disktrans), aging em dias úteis, previsão de zeragem pelo
ritmo de entregas e evolução semanal e mensal. Mostra se as ações estão sendo efetivas.

---

## Estrutura do repositório

```
.
├── front/                 Painel estático publicado no GitHub Pages
│   ├── index.html
│   ├── css/               variaveis.css (cores da marca) · styles.css
│   ├── js/                datas.js (dias úteis) · regras.js (regras e agregações)
│   │                      views.js (abas) · dom.js (montagem do DOM) · app.js (carga e eventos)
│   └── data/trocas.json   Snapshot da base (gerado por back/scripts/atualizar_base.py)
├── back/
│   ├── sql/base_trocas.sql        Consulta no disktrans_gold
│   ├── scripts/atualizar_base.py  Gera front/data/trocas.json
│   └── app/                       Esqueleto FastAPI do template (para uma API futura)
├── banco/                 Scripts SQL de estrutura (template; não usado hoje)
├── docs/                  Diretrizes do Data Lake e decisões
└── .github/workflows/     validacao.yml (checklist) · pages.yml (publicação)
```

### Como os dados chegam ao painel

O painel não acessa o banco. O script `back/scripts/atualizar_base.py` roda
`back/sql/base_trocas.sql` no Data Lake (somente leitura) e grava um JSON compacto em
`front/data/trocas.json`, que o navegador carrega. Veja `docs/decisao-snapshot-estatico.md`.

**Dados publicados:** só atendimento (nome da concessionária/unidade), datas de solicitação,
prazo e entrega, status do romaneio e se está em aberto. Nenhum dado de cliente
(nome, CNPJ, endereço, solicitante). O repositório e o link do Pages são públicos.

Escopo da base: tipos Troca e Troca de Modelo (`gld_fato_trocas`, `codigo_tipo_solicitacao IN ('T','M')`),
todas as em aberto + abertas ou entregues a partir de 01/08/2026. Data de entrega = `data_finalizacao_efetiva`
(se vazia, `data_entrega_solicitacao`); SLA realizado = `duracao_atendimento_dias_uteis`.
Dias úteis = segunda a sexta, como no gold (que não desconta feriados nacionais).

## Atualizar os dados

Hoje a extração usa o login SSO pessoal pelo conector da skill `especialista-de-dados`
(máquina da dona do projeto). Para automatizar, o caminho é uma Service Principal própria
usando `back/app/integracoes/fabric_gold.py` (ver `docs/diretrizes-uso-datalake.md`).

```bash
python back/scripts/atualizar_base.py
git add front/data/trocas.json
git commit -m "chore: atualiza base de trocas"
git push
```

Ao chegar na `main`, o workflow `pages.yml` republica o painel em ~1 minuto.

## Rodar localmente

```bash
cd front
python -m http.server 5500
```

Abra `http://localhost:5500`.

## Publicação (uma vez)

Settings → Pages → Build and deployment → Source = **GitHub Actions**.

## Checklist antes de abrir um Pull Request

- [ ] `bash validate.sh` sem erros
- [ ] Nenhuma credencial, token ou link de planilha no diff
- [ ] `front/data/trocas.json` sem dado de cliente (só as colunas listadas acima)
- [ ] Sem `innerHTML` com dado externo (use `el()` de `front/js/dom.js`)
- [ ] `git status` e `git diff --staged` revisados
