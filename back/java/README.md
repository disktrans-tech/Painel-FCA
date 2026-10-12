# Backend Java (Spring Boot)

Alternativa ao backend Python (`back/python/`). **Escolha um dos dois** ao
criar o projeto real a partir do template e apague a pasta do outro — veja
`CLAUDE.md` e o `README.md` na raiz do repositório.

## Pré-requisitos

- Java 17+
- Maven

## Configurar variáveis de ambiente

Usa as mesmas variáveis do `.env.example` da raiz (`DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `API_HOST`, `API_PORT`,
`API_CORS_ORIGINS`, `AMBIENTE`). O `application.properties` deste projeto só
tem *referências* a essas variáveis (`${DB_HOST}` etc.) — nenhum valor real
fica no código.

O Spring Boot lê variáveis de ambiente do sistema operacional automaticamente.
Para rodar localmente, exporte-as no shell antes de subir a aplicação (copie
`.env.example` para `.env`, preencha com os valores reais e exporte):

```bash
cd back/java
set -a && source ../../.env && set +a   # Linux/Mac — carrega o .env no shell
mvn spring-boot:run
```

No Windows (PowerShell), exporte cada variável com `$env:NOME = "valor"` antes
de rodar, ou configure-as na sua IDE (Run Configuration → Environment
Variables).

A API sobe em `http://localhost:8000` (ou na porta definida em `API_PORT`).

## Estrutura

```
back/java/
├── pom.xml
└── src/main/
    ├── java/com/disktrans/template/
    │   ├── TemplateApplication.java   Ponto de entrada
    │   ├── config/CorsConfig.java     CORS — só origens de API_CORS_ORIGINS
    │   └── exemplo/                   Controller + DTO de exemplo — copie o
    │                                  padrão e apague quando não precisar mais
    └── resources/application.properties
```

Ao renomear o projeto, atualize o `groupId`/`artifactId` do `pom.xml` e o
pacote Java (`com.disktrans.template`) para o nome real do projeto.

## Acesso ao Data Lake (Microsoft Fabric)

Não há ainda um módulo de referência para o backend Java. Se o projeto
precisar consumir o Data Lake (`disktrans_gold`), veja
`docs/diretrizes-uso-datalake.md` para as regras de conexão e uso, e use
`back/python/app/integracoes/fabric_gold.py` como referência do padrão já
validado (Service Principal via Entra ID, pool de conexões, retry com
backoff exponencial) para reproduzir com as bibliotecas equivalentes em
Java (ex.: `azure-identity` para Java + driver JDBC do SQL Server).
