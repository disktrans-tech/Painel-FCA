# Diretrizes de Uso do Data Lake Disktrans

Documento com as regras de acesso e uso do Data Lake Disktrans (Microsoft Fabric, camada Gold - `disktrans_gold`). O documento contém as seguintes seções:
1. Guia de conexão via Service Principal. 
2. Regras de uso

## 1. Guia de Conexão via Service Principal

Todo acesso de aplicações/usuários ao Data Lake é feito exclusivamente via **Service Principal (Entra ID)** contra o **SQL Analytics Endpoint** do Lakehouse `disktrans_gold`. 
Não há acesso via usuário/senha, autenticação interativa (MFA) ou string de conexão com credencial de usuário nominal.

`disktrans_gold` é um **Lakehouse**, não um Warehouse - isso importa porque muda o mecanismo de controle de acesso (ver 1.1.4): não é GRANT/REVOKE de T-SQL, é **OneLake Data Access Role**.

### 1.1 Pré-requisitos

Antes de qualquer aplicação conseguir conectar, os seguintes itens precisam estar prontos:

1. **App Registration no Entra ID**, gerando:
   - `Tenant ID`
   - `Client ID` (Application ID)
   - `Client Secret`
   **Responsabilidade de quem está solicitando o acesso**
2. **Duas tenant settings do Fabric habilitadas** no Admin Portal (sem as duas, a Service Principal nem autentica ou nem lê dado):
   - "Service principals can use Fabric APIs"
   - "Users can access data stored in OneLake with apps external to Fabric"
3. **Service Principal adicionada ao workspace do Fabric** com o papel mínimo necessário (normalmente `Viewer` é suficiente para leitura via SQL endpoint; `Contributor` só se a aplicação também precisar disparar operações no workspace, o que não é o padrão esperado aqui).
4. **Service Principal incluída numa OneLake Data Access Role do Lakehouse `disktrans_gold`**, escopada às tabelas que a aplicação precisa. 
Isso é configurado na UI do Lakehouse (Manage OneLake data access roles). 
Cada aplicação recebe sua própria role (ou é adicionada a uma role já escopada ao que precisa), nunca uma role "acesso total" por padrão.
   - A OneLake Data Access Role pode restringir não só por tabela, mas também **por linha** (row-level). 
   Uma tabela pode aparecer como "liberada" e ainda assim devolver só um subconjunto das linhas, dependendo de como a role foi configurada. 
   Isso significa que uma aplicação não pode assumir "tabela acessível = vejo tudo" - sempre validar o retorno real, não só a permissão de acesso.

### 1.2 Server name e Database

- **Server**: SQL Analytics Endpoint do Lakehouse, obtido em Lakehouse `disktrans_gold` > Configurações > SQL analytics endpoint (O time de dados te mandará!).
- **Database**: `disktrans_gold`
- Porta padrão `1433`, TLS obrigatório (o driver já força isso).

### 1.3 Conexão via Python (pyodbc + azure-identity, autenticação por token)

**Este é o padrão em uso e já validado na Disktrans** (script de referência: `conectar_fabric.py`, testado com sucesso contra o Lakehouse `disktrans_gold` - ver histórico de teste em 1.4). Recomendado para aplicações Python porque não deixa o secret trafegar como parte da connection string:

```python
import os
import struct
import pyodbc
from dotenv import load_dotenv
from azure.identity import ClientSecretCredential

load_dotenv()  # variáveis em .env, nunca hardcoded - ver 1.5

tenant_id = os.getenv("FABRIC_TENANT_ID")
client_id = os.getenv("FABRIC_CLIENT_ID")
client_secret = os.getenv("FABRIC_CLIENT_SECRET")
sql_endpoint = os.getenv("FABRIC_SQL_ENDPOINT")  # SQL analytics endpoint do Lakehouse
sql_database = os.getenv("FABRIC_SQL_DATABASE", "disktrans_gold")

credential = ClientSecretCredential(tenant_id, client_id, client_secret)
token = credential.get_token("https://database.windows.net/.default")

token_bytes = token.token.encode("utf-16-le")
token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
SQL_COPT_SS_ACCESS_TOKEN = 1256

conn_str = (
    "Driver={ODBC Driver 18 for SQL Server};"
    f"Server={sql_endpoint},1433;"
    f"Database={sql_database};"
    "Encrypt=yes;TrustServerCertificate=no;"
)

conn = pyodbc.connect(conn_str, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct})
```

### 1.4 Teste de conexão e de isolamento

Depois de configurado, validar em 3 etapas (roteiro já usado e documentado em teste real na Disktrans):

1. **Login**: conectar e rodar uma query trivial numa tabela que a Service Principal deveria ter liberada. Se falhar com **erro 18456** (`authentication failed`), o problema está nos pré-requisitos 1.1.2/1.1.3 (tenant settings ou papel no workspace) - não é problema de connection string nem do driver.
2. **Permissão por tabela**: se o login passar mas a query falhar com **erro 373** (`SELECT permission or external policy action ... was denied`), a tabela ainda não foi liberada na OneLake Data Access Role (1.1.4) - a mensagem não expõe dado nenhum da tabela negada, só confirma que o acesso está bloqueado, o que é o comportamento esperado.
3. **Isolamento**: depois que uma tabela estiver liberada, testar deliberadamente uma consulta a uma tabela **fora** do escopo concedido, esperando o mesmo erro 373. Isso confirma que o isolamento por app está funcionando, não é um teste opcional.

Exemplo de query de validação (trocar pela tabela realmente liberada para essa Service Principal):
```sql
SELECT TOP 10 * FROM dbo.gld_fato_os_manutencao;
```

### 1.5 Segurança da credencial

- Client secret/certificado nunca em código-fonte, `.env` versionado ou log de aplicação. Ao usar o arquivo `.env`, jamais suba ele ao Github ou compartilhe ele em arquivos `.zip`.
- Rotação de secret: definir prazo (recomendado 6 meses) e responsável.
- Cada aplicação/uso deve ter sua própria Service Principal, não compartilhar uma única SP entre múltiplos sistemas - isso permite revogar acesso de um consumidor sem afetar os demais e rastrear uso por origem.

---

## 2. Regras de Uso

Escopo desta seção: aplicações internas consumindo via Service Principal, restritas à camada **Gold** (`disktrans_gold`). Não há liberação de Silver/Bronze nem de acesso externo (parceiros/concessionárias) neste momento - se isso mudar no futuro, esta seção precisa ser revisada, porque os limites abaixo foram pensados para tráfego interno e controlado.

Contexto importante para entender o "porquê" destas regras: O SQL Analytics Endpoint do Warehouse consome da mesma capacidade Fabric usada por notebooks, pipelines e refresh de modelo semântico (dashboards do Power BI) - uma aplicação mal comportada no endpoint pode competir por capacidade com o próprio pipeline de produção (Silver/Gold/refresh Power BI). As regras abaixo existem para proteger essa capacidade compartilhada, não são burocracia gratuita.

### 2.1 Escopo de acesso

- Acesso **somente leitura** (`SELECT`). Isso é garantido pela própria natureza da Service Principal: ela não consegue executar `INSERT`/`UPDATE`/`DELETE`/`DDL`/`GRANT`/`REVOKE` no SQL Analytics Endpoint - a escrita em Gold é responsabilidade exclusiva dos notebooks do pipeline.
- Acesso controlado por **OneLake Data Access Role**, escopada por tabela (e, quando necessário, por linha - ver 1.1.4) - nunca criar/usar uma role "acesso total" por padrão para uma aplicação nova.
- **Nunca** incluir a Service Principal de uma aplicação numa role que dê acesso a tabelas de configuração (ex.: `cfg_usuarios_rls` e equivalentes) - essas são de uso interno do modelo Power BI.
- Cada aplicação recebe apenas as tabelas que efetivamente usa, dentro de sua própria role (ou role compartilhada já escopada ao mesmo conjunto de tabelas). Pedido de acesso a tabela nova = revisão explícita da role, não é assumido por padrão.

### 2.2 Filtros obrigatórios em tabelas fato

- **Proibido `SELECT * FROM gld_fato_*` sem `WHERE`** (ou equivalente: `TOP` sozinho não substitui filtro - limita linhas retornadas, mas não impede o scan completo da tabela no motor). Tabelas fato no Gold têm centenas de milhares de linhas (`gld_fato_trocas` e `gld_fato_pulso_vendas` passam de 800 mil e 90 mil linhas respectivamente) e crescem continuamente.
- Toda query de aplicação contra tabela fato deve ter pelo menos um filtro seletivo: recorte de data (via coluna de data da própria fato ou join com `gld_dim_data`), filial, ou cliente - o que fizer sentido para o caso de uso.
- Se a aplicação genuinamente precisa da tabela inteira (ex: carga inicial de cache local, sincronização completa), isso é uma exceção que precisa ser combinada previamente, não uma prática recorrente a cada chamada.
- Para dimensões pequenas (`gld_dim_data`, `gld_dim_unidade_negocio`, `gld_dim_modelo`, `gld_dim_feriado`), `SELECT *` sem filtro é aceitável - não é aqui que mora o risco.

### 2.3 Concorrência e padrão de conexão

- Não abrir uma conexão nova por requisição - usar connection pooling na aplicação, com um número máximo de conexões simultâneas configurado explicitamente (não deixar "ilimitado").
- Evitar múltiplas queries pesadas disparadas em paralelo pela mesma aplicação; preferir serializar ou limitar concorrência interna quando a query não é trivial.
- Se a aplicação receber erro de throttling/capacidade (equivalente ao `TooManyRequestsForCapacity` já visto no workspace), o comportamento correto é retry com backoff exponencial, não retry imediato em loop.

### 2.4 Testes e cargas de desenvolvimento

- Testes automatizados (CI, smoke test, healthcheck) devem rodar contra volume representativo mínimo, não em loop contínuo/alta frequência contra o endpoint de produção. Se precisar rodar muitas iterações (teste de carga, testes de performance, etc.), avisar antes - isso concorre com a mesma capacidade do pipeline de produção.
- Ambiente de desenvolvimento/homologação, quando existir, deve ter sua própria Service Principal, separada da usada em produção - facilita saber de onde vem uma carga inesperada.
- Nenhuma aplicação deve fazer polling frequente (ex: a cada poucos segundos) para checar "se mudou algo" numa tabela fato grande - isso é sempre mais caro do que parece e escala mal. As tabelas do Gold já têm cadência de atualização definida no pipeline (frequencia: diario, 1h, 2h ou 3h) - a aplicação deve consultar respeitando esse schedule conhecido, não inventar um polling próprio numa frequência maior.

### 2.5 Responsabilidade e rastreabilidade

- Uma Service Principal por aplicação (já estabelecido na seção 1.7) também serve para isto: se uma carga anômala aparecer no Capacity Metrics App, dá pra saber de qual aplicação veio.
- Toda Service Principal com acesso ao Data Lake deve estar documentada (aplicação dona, tabelas liberadas via OneLake Data Access Role, contato responsável, e se há filtro por linha em alguma tabela) - este documento não substitui esse registro, só define as regras de uso.
