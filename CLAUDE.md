# Instruções para o Claude trabalhar neste projeto

Este repositório nasceu do template `_template-disktrans` da Disktrans.
Quem te chamou para trabalhar aqui provavelmente não conhece a estrutura
do projeto em detalhes — é você quem deve manter a organização abaixo,
sem esperar que a pessoa saiba pedir isso.

## Estrutura fixa — não misture as camadas

Stack escolhido neste projeto: **frontend vanilla** (HTML/CSS/JS, sem build) e **backend Python**.

```
front/   → Painel estático publicado no GitHub Pages (workflow pages.yml).
           Nunca fala com o banco: lê front/data/trocas.json.
back/    → Único lugar com acesso a dados.
  sql/      Consultas somente leitura no Data Lake (disktrans_gold).
  scripts/  atualizar_base.py: gera front/data/trocas.json (sem dado de cliente).
  app/      Esqueleto FastAPI do template, para uma API futura.
banco/   → Scripts SQL de estrutura (DDL). Nunca dados reais.
docs/    → Documentação de apoio (ver decisao-snapshot-estatico.md).
```

O repositório e o Pages são **públicos**: nada que identifique cliente ou pessoa pode entrar
em `front/data/`. No frontend, monte o DOM com `el()` de `front/js/dom.js` (nunca `innerHTML`).

Ao adicionar funcionalidade:

- Tela/interação nova → arquivos em `front/vanilla/` ou `front/react/`, o
  stack escolhido para o projeto (HTML separado de CSS separado de JS, ou
  componentes React; um arquivo, uma responsabilidade — se passar de ~300
  linhas, considere dividir).
- Regra de negócio, cálculo, validação de permissão, acesso a dado sensível →
  sempre em `back/python/app/` ou `back/java/src/...` (o stack escolhido),
  nunca no JS/JSX do frontend.
- Nova tabela ou coluna → novo script numerado em `banco/` (ex.: `002_...sql`), nunca edite um script antigo que já foi aplicado.
- Integração com sistema externo (Data Lake, API de terceiro, webhook) →
  módulo isolado em `back/python/app/integracoes/` (ou pacote equivalente em
  `back/java/src/...`), com um ponto único de conexão que o resto do backend
  chama — nenhum router/controller abre conexão direto com o sistema externo.

### `banco/` (banco da aplicação) x Data Lake (`disktrans_gold`)

São dois sistemas diferentes, não confunda nem misture a lógica de acesso:

- `banco/` + `back/.../database.py` → banco **operacional** deste projeto
  (Postgres/Supabase), leitura e escrita, dado próprio da aplicação.
- Data Lake da Disktrans (Microsoft Fabric, lakehouse `disktrans_gold`) →
  sistema **à parte**, **somente leitura**, para consumir dado consolidado
  (Gold) quando o projeto precisar dele — não é onde a aplicação grava seus
  próprios dados. Regras de conexão e uso: `docs/diretrizes-uso-datalake.md`.
  Se o projeto acessar o Data Lake, siga o padrão validado em
  `back/python/app/integracoes/fabric_gold.py` (Service Principal, pool de
  conexões, retry com backoff) em vez de reimplementar do zero.

## Regras que valem para qualquer código escrito aqui

Siga as diretrizes de frontend da Disktrans (arquivos, segurança, LGPD, Git) e a identidade visual da marca (cores, tipografia, logo, tom de voz). Se você é uma instância do Claude com acesso à skill `diretrizes-disktrans`, use-a em toda tarefa deste projeto — ela cobre frontend (HTML/CSS/JS/React), backend (Python/FastAPI e Java/Spring Boot), identidade visual (cores, tipografia, logo) e as regras de comentários, nomenclatura de variáveis, segurança e LGPD. Resumo do que mais importa neste template:

- Sem credencial, token, senha ou connection string em código — tudo vem de variável de ambiente (`.env`, nunca commitado). `config.js` (vanilla ou React) só tem configuração pública.
- Sem link de planilha (Google Sheets, Excel Online, SharePoint, OneDrive) em nenhum arquivo do repositório — código, comentário, commit message ou `docs/`. Um link "só de leitura" ainda expõe dado interno/de cliente para quem tiver acesso ao repositório; se precisar referenciar uma planilha, descreva o conteúdo ou aponte para o registro no SharePoint do projeto (só o link do registro do projeto em si, não de planilhas de dados).
- SQL sempre parametrizado; nunca concatenar valor de usuário em query.
- Nunca `innerHTML` (vanilla) ou `dangerouslySetInnerHTML` (React) com dado de usuário/API no frontend — use `textContent`/`createElement` ou deixe o JSX renderizar como texto.
- Cada endpoint da API retorna só os campos que a tela usa (nunca "SELECT *" disfarçado em JSON) — isso é minimização de dado pessoal (LGPD).
- Autorização (este usuário pode ver/alterar este registro?) é verificada no backend, nunca só no frontend.

## Como rodar e testar — sempre localmente, sempre isolado

Identifique qual stack o projeto está usando (olhe qual pasta existe: só
`back/python/`, só `back/java/`, ou ambas ainda por decidir) antes de dar
instruções. Nunca instale nada fora de um ambiente isolado (venv, ou o
próprio Maven/npm local do projeto).

**Backend Python** (`back/python/`):

```bash
cd back/python
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate          # Windows (cmd)
# venv\Scripts\Activate.ps1      # Windows (PowerShell)
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Se adicionar uma biblioteca nova, sempre atualize `back/python/requirements.txt` (`pip freeze > requirements.txt` dentro do venv ativado, revisando o que entrou).

**Backend Java** (`back/java/`, Spring Boot — veja `back/java/README.md`):

```bash
cd back/java
mvn spring-boot:run
```

**Frontend vanilla** (`front/vanilla/`) — sem build, servido como arquivo estático (ex.: extensão "Live Server" do VS Code, ou `python -m http.server` dentro da pasta). Chama a API pela URL em `front/vanilla/js/config.js`.

**Frontend React** (`front/react/`, Vite — veja `front/react/README.md`):

```bash
cd front/react
npm install
npm run dev
```

## Antes de qualquer commit

- `git status` e `git diff --staged` revisados — nunca `git add .` sem olhar.
- Nenhum segredo (senha, token, chave de API, connection string) e nenhum link de planilha (Google Sheets, Excel Online, SharePoint, OneDrive) no diff.
- Nenhum dado real de cliente/colaborador no diff.
- Se `banco/*.sql` mudou, confirme que é só estrutura (DDL), sem dados.
- Mensagem de commit descritiva, em português, no imperativo (`feat: ...`, `fix: ...`, `refactor: ...`).

## Ao criar um projeto novo a partir deste template

1. Escolha o stack de backend (Python ou Java) e o de frontend (vanilla ou React) — pelo que o usuário pediu, ou pelo que fizer mais sentido para o projeto.
2. Apague por completo a pasta do stack **não escolhido** em `back/` e em `front/` (ex.: se escolher Python, apague `back/java/`; se escolher vanilla, apague `front/react/`).
3. Suba o conteúdo da pasta do stack escolhido para o nível de `back/`/`front/` (ex.: `back/python/app` vira `back/app`, `back/python/requirements.txt` vira `back/requirements.txt`; `front/react/src` vira `front/src`, etc.) e apague a pasta intermediária vazia (`back/python/`, `front/react/`). Isso mantém os caminhos simples (`back/app/...`, `cd back`) como o resto da documentação do template assume.
4. Atualize `README.md` com: nome real do projeto, área responsável, dono, status, link do registro no SharePoint e link de produção (quando existir), e ajuste os trechos do README/CLAUDE.md que ainda mencionam os dois stacks para refletir só o escolhido. Isso é obrigatório — é o que permite que qualquer pessoa (ou qualquer Claude) entenda o contexto do projeto sem precisar perguntar.
