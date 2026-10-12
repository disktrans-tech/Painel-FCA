# Frontend React (Vite)

Alternativa ao frontend HTML/CSS/JS puro (`front/vanilla/`). **Escolha um dos
dois** ao criar o projeto real a partir do template e apague a pasta do
outro — veja `CLAUDE.md` e o `README.md` na raiz do repositório.

## Pré-requisitos

- Node.js 18+

## Configurar variáveis de ambiente

```bash
cd front/react
cp .env.example .env.local
```

O Vite só expõe ao navegador variáveis prefixadas com `VITE_` — nunca coloque
segredo em nenhuma delas, só configuração pública (ex.: URL da API).

## Rodar localmente

```bash
cd front/react
npm install
npm run dev
```

Sobe em `http://localhost:5500` por padrão. A aplicação chama a API pela URL
configurada em `VITE_API_URL` (`.env.local`), lida em `src/config.js`.

## Estrutura

```
front/react/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── src/
    ├── main.jsx      Ponto de entrada
    ├── App.jsx        Orquestra a tela — chama api.js, nunca regra de negócio aqui
    ├── api.js         Toda chamada HTTP à API passa por aqui
    ├── config.js      Configuração pública (nenhum segredo)
    └── styles/        CSS compartilhado (variáveis + estilos gerais)
```

Convenções: componentes em `src/`, nunca `dangerouslySetInnerHTML` com dado de
usuário/API, autorização e regra de negócio sempre no backend.
