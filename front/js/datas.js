// Utilitários de data (dias úteis = seg-sex, sem feriados)
const DIA_MS = 864e5;
const BASE_UTC = Date.UTC(2015, 0, 1);
const FIM_UTC = Date.UTC(2035, 0, 1);

export function d0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function fmtDate(d) {
  return d ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() : '—';
}
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// dias úteis acumulados por dia (tabela calculada uma vez): busDays vira uma subtração
let acumulado = null;
function montarTabela() {
  const n = Math.round((FIM_UTC - BASE_UTC) / DIA_MS) + 1;
  acumulado = new Int32Array(n);
  let c = 0;
  for (let i = 0; i < n; i++) {
    const w = new Date(BASE_UTC + i * DIA_MS).getUTCDay();
    if (w !== 0 && w !== 6) c++;
    acumulado[i] = c;
  }
}
function indice(d) {
  const i = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - BASE_UTC) / DIA_MS);
  return Math.min(Math.max(i, 0), acumulado.length - 1);
}

// dias úteis em (start, end]. Negativo se end < start.
export function busDays(start, end) {
  if (!start || !end) return 0;
  if (!acumulado) montarTabela();
  return acumulado[indice(end)] - acumulado[indice(start)];
}

export function addBusDays(d, n) {
  const x = d0(d);
  const step = n < 0 ? -1 : 1;
  let c = 0;
  const alvo = Math.abs(n);
  while (c < alvo) {
    x.setDate(x.getDate() + step);
    const w = x.getDay();
    if (w !== 0 && w !== 6) c++;
  }
  return x;
}

export function startOfWeek(d) { // segunda-feira
  const x = d0(d), w = x.getDay(), diff = (w === 0 ? -6 : 1 - w);
  return addDays(x, diff);
}
export function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
