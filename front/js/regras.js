// Estado, regras de negócio e agregações
import { d0, addDays, busDays, addBusDays } from './datas.js';

export const state = { rows: [], scope: 'todos', ctrl: 'in', ref: d0(new Date()), tab: 'resumo', geradoEm: null };

export const FAIXAS = [
  { k: 'Em dia', test: a => a <= 0, color: 'var(--ok)' },
  { k: '1-3', test: a => a > 0 && a <= 3, color: 'var(--f1)' },
  { k: '3-6', test: a => a > 3 && a <= 6, color: 'var(--f2)' },
  { k: '6-9', test: a => a > 6 && a <= 9, color: 'var(--f3)' },
  { k: '9-15', test: a => a > 9 && a <= 15, color: 'var(--f4)' },
  { k: '15-30', test: a => a > 15 && a <= 30, color: 'var(--f5)' },
  { k: '+30', test: a => a > 30, color: 'var(--f6)' },
];

export const isControle = r => /controle/i.test(r.srom);
const isDisk = r => /^disktrans/i.test(r.conc || '');

function inScope(r) {
  if (state.scope === 'css') return !isDisk(r);
  if (state.scope === 'disk') return isDisk(r);
  return true;
}

export function agingOf(r, ref) { return r.prazo ? busDays(r.prazo, ref) : 0; }
export function atendName(r) { return (r.conc || '(sem atendimento)').trim(); }
// a base já vem só com Troca + Troca de Modelo
export function baseRows() { return state.rows.filter(inScope); }

// em aberto numa data D (reconstrução): abriu até D e não saiu até D
export function openAt(r, D) {
  if (!r.dsolic) return false;
  if (r.dsolic > d0(D)) return false;
  if (r.dentr && r.dentr <= d0(D)) return false;
  return true;
}
// em aberto "agora" (posição atual pelo status)
export function openNow(r) {
  if (!r.aberta) return false;
  if (state.ctrl === 'out' && isControle(r)) return false;
  return true;
}
export function deliveredBetween(r, a, b) { return r.dentr && r.dentr >= d0(a) && r.dentr <= d0(b); }
export function openedBetween(r, a, b) { return r.dsolic && r.dsolic >= d0(a) && r.dsolic <= d0(b); }

export function faixaIdx(a) { for (let i = 0; i < FAIXAS.length; i++) if (FAIXAS[i].test(a)) return i; return 0; }

// peso de severidade por faixa: +30 pesa mais. Em dia = 0
const SEVW = [0, 1, 2, 3, 4, 5, 6];
function sevScore(faixas) { let s = 0; for (let i = 0; i < faixas.length; i++) s += faixas[i] * SEVW[i]; return s; }
// ordena pelo MAIOR ATRASO: severidade, depois vencidos, depois total
export function byAtraso(x, y) { return (y.sev - x.sev) || (y.venc - x.venc) || (y.total - x.total); }

export function aggAtend() {
  const ref = state.ref, map = {};
  baseRows().forEach(r => {
    if (!openNow(r)) return;
    const a = atendName(r);
    if (!map[a]) map[a] = { at: a, total: 0, venc: 0, ctrl: 0, faixas: Array(FAIXAS.length).fill(0) };
    const g = agingOf(r, ref);
    map[a].total++; map[a].faixas[faixaIdx(g)]++;
    if (g > 0) map[a].venc++;
    if (isControle(r)) map[a].ctrl++;
  });
  const arr = Object.values(map);
  arr.forEach(d => { d.sev = sevScore(d.faixas); });
  return arr.sort(byAtraso);
}

export function sevAtDate(D) {
  const m = {};
  baseRows().forEach(r => {
    if (!openAt(r, D)) return;
    const a = atendName(r);
    if (!m[a]) m[a] = { faixas: Array(FAIXAS.length).fill(0), venc: 0 };
    const g = r.prazo ? busDays(r.prazo, D) : 0;
    m[a].faixas[faixaIdx(g)]++;
    if (g > 0) m[a].venc++;
  });
  const o = {};
  for (const a in m) o[a] = { sev: sevScore(m[a].faixas), venc: m[a].venc };
  return o;
}

// taxa de entrega por dia útil nos últimos nBus dias úteis até a referência
export function dailyRate(rows, nBus) {
  const ref = state.ref;
  const start = addDays(addBusDays(ref, -nBus), 1);
  let c = 0;
  rows.forEach(r => { if (deliveredBetween(r, start, ref)) c++; });
  return { total: c, perDay: c / nBus, start };
}
