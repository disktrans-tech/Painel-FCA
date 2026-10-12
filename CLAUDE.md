# Instruções para o Claude trabalhar neste projeto

Este repositório nasceu do template `_template-disktrans` da Disktrans.
Quem te chamou para trabalhar aqui provavelmente não conhece a estrutura
do projeto em detalhes — é você quem deve manter a organização abaixo,
sem esperar que a pessoa saiba pedir isso.

## Estrutura fixa — não misture as camadas

```
front/   → HTML, CSS e JS. Fala só com a API em back/ (nunca com o banco direto).
back/    → API em Python (FastAPI). Único lugar com acesso ao banco.
banco/   → Scripts SQL de estrutura (DDL). Nunca dados reais.
docs/    → Documentação de apoio, se precisar.
```

Ao adicionar funcionalidade:

- Tela/interação nova → arquivos em `front/` (HTML separado de CSS separado de JS; um arquivo, uma responsabilidade — se passar de ~300 linhas, considere dividir).
- Regra de negócio, cálculo, validação de permissão, acesso a dado sensível → sempre em `back/app/`, nunca no JS do frontend.
- Nova tabela ou coluna → novo script numerado em `banco/` (ex.: `002_...sql`), nunca edite um script antigo que já foi aplicado.

## Regras que valem para qualquer código escrito aqui

Siga as diretrizes de frontend da Disktrans (arquivos, segurança, LGPD, Git) — se você é uma instância do Claude com acesso à skill `diretrizes-frontend-disktrans`, use-a. Resumo do que mais importa neste template:

- Sem credencial, token, senha ou connection string em código — tudo vem de variável de ambiente (`.env`, nunca commitado). `front/js/config.js` só tem configuração pública.
- SQL sempre parametrizado; nunca concatenar valor de usuário em query.
- Nunca `innerHTML` com dado de usuário/API no frontend — use `textContent`/`createElement`.
- Cada endpoint da API retorna só os campos que a tela usa (nunca "SELECT *" disfarçado em JSON) — isso é minimização de dado pessoal (LGPD).
- Autorização (este usuário pode ver/alterar este registro?) é verificada no backend, nunca só no frontend.

## Como rodar e testar — sempre localmente, sempre com venv

Sempre que você (Claude) for dar instruções para rodar o projeto, rodar testes, instalar algo ou verificar se o backend está funcionando, siga este padrão — não rode nada fora do ambiente isolado:

```bash
# 1. Entrar na pasta do backend
cd back

# 2. Criar o ambiente virtual (só na primeira vez)
python3 -m venv venv

# 3. Ativar o ambiente virtual
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate          # Windows (cmd)
# venv\Scripts\Activate.ps1      # Windows (PowerShell)

# 4. Instalar as dependências dentro do venv
pip install -r requirements.txt

# 5. Rodar a API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Se adicionar uma biblioteca nova ao backend, sempre atualize `back/requirements.txt` (`pip freeze > requirements.txt` dentro do venv ativado, revisando o que entrou) para a próxima pessoa/Claude conseguir reproduzir o ambiente.

O frontend não tem build — é HTML/CSS/JS puro servido como arquivo estático (ex.: extensão "Live Server" do VS Code, ou `python -m http.server` dentro de `front/`). Ele chama a API pela URL configurada em `front/js/config.js`.

## Antes de qualquer commit

- `git status` e `git diff --staged` revisados — nunca `git add .` sem olhar.
- Nenhum segredo, nenhum dado real de cliente/colaborador no diff.
- Se `banco/*.sql` mudou, confirme que é só estrutura (DDL), sem dados.
- Mensagem de commit descritiva, em português, no imperativo (`feat: ...`, `fix: ...`, `refactor: ...`).

## Ao criar um projeto novo a partir deste template

Atualize `README.md` com: nome real do projeto, área responsável, dono, status, link do registro no SharePoint e link de produção (quando existir). Isso é obrigatório — é o que permite que qualquer pessoa (ou qualquer Claude) entenda o contexto do projeto sem precisar perguntar.
