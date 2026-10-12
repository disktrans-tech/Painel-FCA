# Nome do Projeto

> Substitua este título e os campos abaixo ao criar um projeto novo a partir deste template.

| Campo | Valor |
|---|---|
| Área responsável | *(preencher)* |
| Dono do projeto | *(preencher)* |
| Status | piloto / produção / descontinuado |
| Registro no SharePoint | *(link)* |
| Link de produção | *(link, quando existir)* |
| Backend / banco | Python (FastAPI) + Supabase (Postgres) |

## O que este projeto faz

*(descreva em 2-3 frases o que a ferramenta resolve e para quem)*

---

## Estrutura do repositório

```
.
├── front/          Frontend — HTML, CSS e JS separados em arquivos/pastas
│   ├── index.html
│   ├── css/
│   └── js/
├── back/           Backend — API em Python (FastAPI). Único ponto de acesso ao banco.
│   ├── app/
│   └── requirements.txt
├── banco/          Scripts SQL de criação das tabelas (estrutura, sem dados)
├── docs/           Documentação de apoio (opcional)
├── .env.example    Modelo das variáveis de ambiente — copie para .env
└── .gitignore
```

O frontend nunca acessa o banco diretamente — toda operação passa pela API em `back/`. Isso mantém regra de negócio, validação e segredo fora do navegador.

---

## Como rodar o projeto localmente

Pré-requisitos: **Python 3.11+** instalado na máquina.

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

### 3. Backend — sempre em ambiente virtual (venv)

O backend roda **sempre** dentro de um ambiente virtual isolado, nunca instalando pacotes direto no Python da máquina.

```bash
cd back

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

A API sobe em `http://localhost:8000`. A documentação interativa (Swagger) fica em `http://localhost:8000/docs`.

Para sair do ambiente virtual quando terminar: `deactivate`.

> Sempre que uma dependência nova for adicionada ao backend, atualize o `requirements.txt` (com o venv ativado: `pip freeze > requirements.txt`, revisando o que foi gerado).

### 4. Banco de dados

Os scripts de criação das tabelas estão em `banco/`. Aplique-os no seu banco (Supabase/Postgres) na ordem numerada — veja `banco/README.md` para instruções.

### 5. Frontend

O frontend é HTML/CSS/JS puro, sem build. Para rodar localmente, sirva a pasta `front/` como arquivo estático — por exemplo:

```bash
cd front
python3 -m http.server 5500
```

E abra `http://localhost:5500` no navegador. Ou, no VS Code, use a extensão "Live Server" clicando com o botão direito em `front/index.html`.

O frontend chama a API pela URL configurada em `front/js/config.js` (por padrão, `http://localhost:8000`).

---

## Convenções do projeto

- **Frontend**: HTML semântico, CSS com variáveis (`front/css/variaveis.css`) e nomenclatura BEM, JS em módulos ES (`import`/`export`), nunca variável global ou `<script>` inline.
- **Backend**: Python com FastAPI. Toda regra de negócio, validação de permissão e acesso ao banco vive aqui — nunca no JS do navegador.
- **Banco**: scripts de estrutura numerados em `banco/` (`001_...`, `002_...`), sem dados reais.
- Estas convenções seguem as diretrizes de frontend e de Git/segurança da Disktrans. Se você é o Claude trabalhando neste repositório, veja também `CLAUDE.md`.

## Checklist antes de abrir um Pull Request

- [ ] Nenhuma credencial, token ou URL interna sensível no código
- [ ] Dados de usuário sanitizados antes de exibir; validação e autorização também no backend
- [ ] Sem `innerHTML` com dado externo (risco de XSS)
- [ ] Toda comunicação por HTTPS (em produção)
- [ ] Sem `console.log` de dado sensível
- [ ] Mensagens de erro amigáveis ao usuário, sem stack trace na tela
- [ ] `git status` e `git diff --staged` revisados antes do commit
- [ ] `banco/*.sql` alterado contém só estrutura, nunca dados reais
- [ ] `README.md` atualizado se algo relevante mudou (variáveis de ambiente, como rodar, status do projeto)

## Segurança e variáveis de ambiente

Todas as credenciais (banco, chaves de API, tokens) ficam **exclusivamente** no `.env` local ou nas variáveis de ambiente do serviço de deploy — nunca em código. Veja `.env.example` para a lista de variáveis que este projeto usa.

Se um segredo for commitado por engano: revogue e gere uma nova credencial imediatamente e avise a área de TI — reescrever o histórico do Git não resolve, porque o valor pode já ter sido exposto.
