#!/usr/bin/env bash
# =============================================================================
# validate.sh — Checklist de segurança e qualidade Disktrans
#
# Baseado nas diretrizes de frontend e no checklist de PR do README.
# Cobre: JS/JSX (vanilla e React), HTML, Python (FastAPI) e Java (Spring Boot).
#
# Uso:
#   bash validate.sh        → analisa todo o repositório
#
# Códigos de saída:
#   0 = aprovado (pode subir / fazer merge)
#   1 = reprovado (corrigir antes de continuar)
# =============================================================================

set -euo pipefail

TARGET="."

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# ─── Helpers ──────────────────────────────────────────────────────────────────

erro() {
  echo -e "${RED}[ERRO]${NC} $1"
  ERRORS=$((ERRORS + 1))
}

aviso() {
  echo -e "${YELLOW}[AVISO]${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  echo -e "${GREEN}[OK]${NC} $1"
}

titulo() {
  echo ""
  echo -e "${CYAN}${BOLD}── $1${NC}"
}

# Busca padrão regex nos arquivos, excluindo pastas de build e dependências
buscar() {
  local padrao="$1"
  local descricao="$2"
  local nivel="${3:-erro}"
  local tipos="${4:---include=*.js --include=*.jsx --include=*.html --include=*.py --include=*.java}"
  local resultado

  resultado=$(grep -rn $tipos \
    -E "$padrao" "$TARGET" \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude-dir="dist" \
    --exclude-dir="build" \
    --exclude-dir="target" \
    --exclude-dir="venv" \
    --exclude-dir=".venv" \
    --exclude-dir="__pycache__" \
    2>/dev/null || true)

  if [ -n "$resultado" ]; then
    if [ "$nivel" = "erro" ]; then
      erro "$descricao"
    else
      aviso "$descricao"
    fi
    echo "$resultado" | head -10 | sed 's/^/  /'
    [ "$(echo "$resultado" | wc -l)" -gt 10 ] && echo "  ... (mais ocorrências — rode grep manualmente para ver todas)"
    return 1
  fi
  return 0
}

# =============================================================================
# VERIFICAÇÕES
# =============================================================================

titulo "1. Arquivos .env versionados no git"

ENV_TRACKED=$(git ls-files 2>/dev/null | grep -E '^\.env$|^\.env\.' | grep -v '\.example$' || true)
if [ -n "$ENV_TRACKED" ]; then
  erro "Arquivo(s) .env rastreado(s) pelo git — remova com: git rm --cached .env"
  echo "$ENV_TRACKED" | sed 's/^/  /'
else
  ok "Nenhum .env rastreado"
fi

titulo "2. Credenciais e segredos hardcoded"

buscar \
  '(password|passwd|senha)\s*=\s*["'"'"'][^"'"'"']{3,}' \
  "Possível senha hardcoded" "erro" || true

buscar \
  '(api_key|apikey|api-key|secret_key|secretkey)\s*[=:]\s*["'"'"'][A-Za-z0-9_\-]{8,}' \
  "Possível chave de API hardcoded" "erro" || true

buscar \
  '(token|bearer)\s*[=:]\s*["'"'"'][A-Za-z0-9_\-\.]{12,}' \
  "Possível token hardcoded" "erro" || true

# JWT do Supabase (anon key) — não é segredo crítico mas deve ficar no .env
buscar \
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.' \
  "Chave JWT (Supabase anon key) hardcoded — mover para variável de ambiente" "aviso" || true

# URL de banco hardcoded
buscar \
  '(postgres|postgresql|mysql|mongodb):\/\/[^"'"'"'\s]+:[^"'"'"'\s]+@' \
  "String de conexão com banco hardcoded (contém credenciais)" "erro" || true

titulo "3. Links de planilhas no repositório"

# Google Sheets, Excel Online, SharePoint, OneDrive — proibido pelo README
buscar \
  '(docs\.google\.com/spreadsheets|sharepoint\.com|onedrive\.live\.com|1drv\.ms|excel\.office\.com)' \
  "Link de planilha (Google Sheets / SharePoint / OneDrive) no código — descreva o conteúdo em vez de linkar" \
  "erro" \
  "--include=*.js --include=*.jsx --include=*.html --include=*.py --include=*.java --include=*.md" || true

titulo "4. XSS — innerHTML e dangerouslySetInnerHTML"

# innerHTML com variável ou template literal (vanilla JS)
buscar \
  'innerHTML\s*[+]?=\s*[`$a-zA-Z_]' \
  "innerHTML recebendo variável ou template literal — risco de XSS. Use textContent ou sanitize." \
  "erro" "--include=*.js --include=*.html" || true

# dangerouslySetInnerHTML com dado externo (React)
buscar \
  'dangerouslySetInnerHTML\s*=\s*\{\{?\s*__html\s*:\s*[a-zA-Z_\$]' \
  "dangerouslySetInnerHTML recebendo variável — risco de XSS" \
  "erro" "--include=*.jsx --include=*.js" || true

titulo "5. Comunicação sem HTTPS (fora de localhost)"

buscar \
  'fetch\s*\(\s*["'"'"']http://(?!localhost|127\.0\.0\.1)' \
  "fetch() para URL http:// sem HTTPS fora de localhost" \
  "erro" "--include=*.js --include=*.jsx" || true

buscar \
  '(url|baseUrl|baseURL|API_URL)\s*[=:]\s*["'"'"']http://(?!localhost|127\.0\.0\.1)' \
  "URL de API configurada sem HTTPS fora de localhost" \
  "erro" "--include=*.js --include=*.jsx --include=*.py --include=*.java" || true

titulo "6. console.log com dado sensível"

buscar \
  'console\.(log|debug)\s*\(.*?(senha|password|token|secret|cpf|email|user|usuario)' \
  "console.log() com dado potencialmente sensível" \
  "erro" "--include=*.js --include=*.jsx" || true

CONSOLE_COUNT=$(grep -rn --include="*.js" --include="*.jsx" \
  -E 'console\.log\(' "$TARGET" \
  --exclude-dir=".git" --exclude-dir="node_modules" \
  --exclude-dir="dist" --exclude-dir="build" \
  2>/dev/null | wc -l || echo "0")
[ "$CONSOLE_COUNT" -gt 0 ] && aviso "${CONSOLE_COUNT} console.log() encontrado(s) — remover antes de produção"

titulo "7. Stack trace exposto ao usuário"

buscar \
  '(res\.json|res\.send|innerHTML|innerText|print).*\b(\.stack|err\.stack|error\.stack|e\.stack|traceback)\b' \
  "Stack trace sendo exposto ao cliente — remover de respostas de API e UI" \
  "erro" || true

# Python: traceback completo retornado na resposta
buscar \
  'traceback\.format_exc\(\)' \
  "traceback.format_exc() pode expor stack trace ao cliente — verificar se é retornado na resposta" \
  "aviso" "--include=*.py" || true

titulo "8. eval() e execução dinâmica de código"

buscar \
  '\beval\s*\(' \
  "eval() encontrado — proibido por risco de injeção de código" \
  "erro" "--include=*.js --include=*.jsx --include=*.py" || true

buscar \
  'new\s+Function\s*\(' \
  "new Function() encontrado — equivale a eval() em JS" \
  "erro" "--include=*.js --include=*.jsx" || true

titulo "9. Dados reais em scripts SQL"

# Padrões que sugerem INSERT com dados reais de pessoas
SQL_DADOS=$(grep -rn --include="*.sql" \
  -iE "INSERT INTO.*(cliente|usuario|user|colaborador|cpf|email|telefone)" "$TARGET" \
  --exclude-dir=".git" 2>/dev/null || true)

if [ -n "$SQL_DADOS" ]; then
  aviso "Scripts SQL com possível dado real de pessoa — banco/*.sql deve conter só estrutura"
  echo "$SQL_DADOS" | head -5 | sed 's/^/  /'
fi

# =============================================================================
# RESULTADO FINAL
# =============================================================================

echo ""
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "${BOLD}  Resultado${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}${BOLD}  ✖ $ERRORS erro(s) — corrija antes de subir${NC}"
fi
if [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}  ⚠ $WARNINGS aviso(s) — revisar antes de ir a produção${NC}"
fi
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✔ Tudo certo!${NC}"
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  ✔ Sem erros críticos.${NC}"
fi

echo ""
[ "$ERRORS" -eq 0 ]
