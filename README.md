# Nome do Projeto

> Substitua este título e os campos abaixo ao criar um projeto novo a partir deste template.

| Campo | Valor |
|---|---|
| Área responsável | *(preencher)* |
| Dono do projeto | *(preencher)* |
| Status | piloto / produção / descontinuado |
| Registro no SharePoint | *(link)* |
| Link de produção | *(link, quando existir)* |
| Backend / banco | Python (FastAPI) ou Java (Spring Boot) + Supabase (Postgres) |
| Frontend | HTML/CSS/JS puro ou React (Vite) |

## O que este projeto faz

*(descreva em 2-3 frases o que a ferramenta resolve e para quem)*

---

## Estrutura do repositório

```
.
├── front/
│   ├── vanilla/    HTML, CSS e JS puro, sem build
│   └── react/      React + Vite
├── back/
│   ├── python/     API em Python (FastAPI)
│   └── java/       API em Java (Spring Boot)
├── banco/          Scripts SQL de criação das tabelas (estrutura, sem dados)
├── docs/           Documentação de apoio (opcional)
├── .env.example    Modelo das variáveis de ambiente do backend — copie para .env
└── .gitignore
```

> Este template traz os dois stacks de backend e os dois de frontend
> funcionando lado a lado só para facilitar a escolha ao criar um projeto
> novo. **Nenhum projeto real deve manter os dois** — escolha um de cada,
> apague as pastas do que não for usado e suba o conteúdo escolhido para o
> nível de `back/`/`front/` (ex.: `back/python/app` → `back/app`). Veja
> `CLAUDE.md` para o passo a passo.

O frontend nunca acessa o banco diretamente — toda operação passa pela API em `back/`. Isso mantém regra de negócio, validação e segredo fora do navegador.

---

## Como rodar o projeto localmente

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd <nome-do-repositorio>
```

### 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Abra o `.env` e preencha com os valores reais (host e credenciais do banco, etc. — peça ao dono do projeto ou à área de TI). **O `.env` nunca é commitado.**

### 3. Backend

Escolha um dos dois (o projeto real deve manter só um):

**Python (FastAPI)** — pré-requisito: Python 3.11+. Roda **sempre** em ambiente virtual isolado, nunca instalando pacotes direto no Python da máquina.

```bash
cd back/python

# Criar o ambiente virtual (só na primeira vez)
python3 -m venv venv

# Ativar o ambiente virtual
source venv/bin/activate        # Linux ou Mac
# venv\Scripts\activate           # Windows (cmd)
# venv\Scripts\Activate.ps1       # Windows (PowerShell)

# Instalar as dependências do projeto (dentro do venv)
pip install -r requirements.txt

# Rodar a API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API sobe em `http://localhost:8000`. A documentação interativa (Swagger) fica em `http://localhost:8000/docs`. Para sair do ambiente virtual: `deactivate`.

> Sempre que uma dependência nova for adicionada, atualize o `requirements.txt` (com o venv ativado: `pip freeze > requirements.txt`, revisando o que foi gerado).

**Java (Spring Boot)** — pré-requisito: Java 17+ e Maven. Veja `back/java/README.md` para detalhes.

```bash
cd back/java
mvn spring-boot:run
```

A API sobe em `http://localhost:8000`.

### 4. Banco de dados

Os scripts de criação das tabelas estão em `banco/`. Aplique-os no seu banco (Supabase/Postgres) na ordem numerada — veja `banco/README.md` para instruções.

### 5. Frontend

Escolha um dos dois (o projeto real deve manter só um):

**Vanilla (HTML/CSS/JS)** — sem build, servido como arquivo estático:

```bash
cd front/vanilla
python3 -m http.server 5500
```

E abra `http://localhost:5500` no navegador. Ou, no VS Code, use a extensão "Live Server" clicando com o botão direito em `front/vanilla/index.html`. Chama a API pela URL configurada em `front/vanilla/js/config.js` (por padrão, `http://localhost:8000`).

**React (Vite)** — pré-requisito: Node.js 18+. Veja `front/react/README.md` para detalhes.

```bash
cd front/react
npm install
npm run dev
```

Sobe em `http://localhost:5500`. Chama a API pela URL configurada em `VITE_API_URL` (`front/react/.env.example` → copie para `.env.local`).

---

## Convenções do projeto

- **Frontend vanilla**: HTML semântico, CSS com variáveis (`css/variaveis.css`) e nomenclatura BEM, JS em módulos ES (`import`/`export`), nunca variável global ou `<script>` inline.
- **Frontend React**: componentes em `src/`, configuração pública em `src/config.js` (nunca segredo em variável `VITE_*`, pois o Vite expõe tudo que começa com esse prefixo ao navegador), nunca `dangerouslySetInnerHTML` com dado externo.
- **Backend**: Python (FastAPI) ou Java (Spring Boot) — toda regra de negócio, validação de permissão e acesso ao banco vive aqui, nunca no JS/JSX do navegador.
- **Banco**: scripts de estrutura numerados em `banco/` (`001_...`, `002_...`), sem dados reais.
- Estas convenções seguem as diretrizes de frontend e de Git/segurança da Disktrans. Se você é o Claude trabalhando neste repositório, veja também `CLAUDE.md`.

## Checklist antes de abrir um Pull Request

- [ ] Nenhuma credencial, token, senha ou URL interna sensível no código
- [ ] Nenhum link de planilha (Google Sheets, Excel Online, SharePoint, OneDrive) em código, comentário, commit message ou `docs/`
- [ ] Dados de usuário sanitizados antes de exibir; validação e autorização também no backend
- [ ] Sem `innerHTML` (vanilla) ou `dangerouslySetInnerHTML` (React) com dado externo (risco de XSS)
- [ ] Toda comunicação por HTTPS (em produção)
- [ ] Sem `console.log` de dado sensível
- [ ] Mensagens de erro amigáveis ao usuário, sem stack trace na tela
- [ ] `git status` e `git diff --staged` revisados antes do commit
- [ ] `banco/*.sql` alterado contém só estrutura, nunca dados reais
- [ ] `README.md` atualizado se algo relevante mudou (variáveis de ambiente, como rodar, status do projeto)

## Segurança e variáveis de ambiente

Todas as credenciais (banco, chaves de API, tokens) ficam **exclusivamente** no `.env` local ou nas variáveis de ambiente do serviço de deploy — nunca em código. Veja `.env.example` para a lista de variáveis que este projeto usa.

Links de planilha (Google Sheets, Excel Online, SharePoint, OneDrive) também nunca entram no repositório, em nenhum arquivo — mesmo parecendo "só leitura", o link pode expor dado interno ou de cliente para quem tiver acesso ao código. Se precisar referenciar uma planilha em `docs/`, descreva o conteúdo em vez de linkar, ou aponte só para o registro do projeto no SharePoint (não para planilhas de dados).

Se um segredo for commitado por engano: revogue e gere uma nova credencial imediatamente e avise a área de TI — reescrever o histórico do Git não resolve, porque o valor pode já ter sido exposto.
