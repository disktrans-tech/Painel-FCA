// Estado, regras de negócio e agregações.
// Modo "Só vencidos" (state.soVenc): aberto = só vencidos, saída = entregas feitas após o prazo,
// entrada = trocas que passaram a estar vencidas no período.
import { d0, addDays, busDays, addBusDays } from './datas.js';

export const state = {
  rows: [], scope: 'todos', ctrl: 'in', soVenc: false, ref: d0(new Date()), tab: 'resumo',
  geradoEm: null, dataBase: d0(new Date()),
};

export const FAIXAS = [
  { k: 'Em dia', test: a => a <= 0, color: 'var(--ok)' },
  { k: '1 D.U.', test: a => a === 1, color: 'var(--f1)' },
  { k: '2-4 D.U.', test: a => a >= 2 && a <= 4, color: 'var(--f2)' },
  { k: '5 D.U.', test: a => a === 5, color: 'var(--f3)' },
  { k: '6-9 D.U.', test: a => a >= 6 && a <= 9, color: 'var(--f4)' },
  { k: '10-15 D.U.', test: a => a >= 10 && a <= 15, color: 'var(--f5)' },
  { k: '16-30 D.U.', test: a => a >= 16 && a <= 30, color: 'var(--f6)' },
  { k: '+30 D.U.', test: a => a > 30, color: 'var(--f7)' },
];
export const faixasVisiveis = () => (state.soVenc ? FAIXAS.slice(1) : FAIXAS);
export function faixaIdx(a) { for (let i = 0; i < FAIXAS.length; i++) if (FAIXAS[i].test(a)) return i; return 0; }

/* ---------------- preparação das linhas ---------------- */
export function preparar(r) {
  r.dvenc = r.prazo ? addBusDays(r.prazo, 1) : null;          // 1º dia útil vencido
  r.atrasoEntrega = r.dentr && r.prazo ? busDays(r.prazo, r.dentr) : 0;
  return r;
}

/* ---------------- filtros básicos ---------------- */
export const isControle = r => /controle/i.test(r.srom);
const isDisk = r => /^disktrans/i.test(r.conc || '');
function inScope(r) {
  if (state.scope === 'css') return !isDisk(r);
  if (state.scope === 'disk') return isDisk(r);
  return true;
}
export const baseRows = () => state.rows.filter(inScope);
export const atendName = r => (r.conc || '(sem atendimento)').trim();
export const agingOf = (r, D) => (r.prazo ? busDays(r.prazo, D) : 0);
export const vencidoEm = (r, D) => agingOf(r, D) > 0;
const entre = (d, a, b) => !!d && d >= d0(a) && d <= d0(b);

/* ---------------- aberto / entrada / saída (respeitam o modo) ---------------- */
// aberto numa data D. A partir da data da base vale o status atual; antes, reconstrói pelas datas.
export function abertoEm(r, D) {
  const dia = d0(D);
  if (!r.dsolic || r.dsolic > dia) return false;
  const aberto = dia >= state.dataBase ? r.aberta : (r.dentr ? r.dentr > dia : r.aberta);
  return aberto && (!state.soVenc || vencidoEm(r, dia));
}
// posição atual na data de referência (respeita "controle de entrega à parte")
export function abertoAgora(r) {
  if (!abertoEm(r, state.ref)) return false;
  return !(state.ctrl === 'out' && isControle(r));
}
// fluxo dos vencidos (independe do modo): entregas após o prazo e trocas que passaram a vencer
const saiuVencida = (r, a, b) => entre(r.dentr, a, b) && r.atrasoEntrega > 0;
function entrouEmVencido(r, a, b) {
  if (!entre(r.dvenc, a, b)) return false;
  return r.dentr ? r.dentr >= r.dvenc : r.aberta;
}
export function saiu(r, a, b) {
  return state.soVenc ? saiuVencida(r, a, b) : entre(r.dentr, a, b);
}
export function entrou(r, a, b) {
  return state.soVenc ? entrouEmVencido(r, a, b) : entre(r.dsolic, a, b);
}

/* ---------------- janelas de dias úteis ---------------- */
// último dia completo da base: se a referência é hoje (dia parcial), a janela termina na véspera
export function fimJanela(D) {
  const dia = d0(D);
  return dia >= state.dataBase ? addDays(state.dataBase, -1) : dia;
}
export function inicioJanela(fim, nBus) { return addDays(addBusDays(fim, -nBus), 1); }

export function dailyRate(rows, nBus, D = state.ref) {
  const fim = fimJanela(D), ini = inicioJanela(fim, nBus);
  let c = 0;
  rows.forEach(r => { if (saiu(r, ini, fim)) c++; });
  return { total: c, perDay: c / nBus, start: ini, end: fim };
}

/* ---------------- ordenação ---------------- */
export const porVencidos = (x, y) => (y.venc - x.venc) || (y.total - x.total);

/* ---------------- por atendimento (posição atual) ---------------- */
export function aggAtend() {
  const ref = state.ref, map = {};
  baseRows().forEach(r => {
    if (!abertoAgora(r)) return;
    const a = atendName(r);
    if (!map[a]) map[a] = { at: a, total: 0, venc: 0, ctrl: 0, faixas: Array(FAIXAS.length).fill(0) };
    const g = agingOf(r, ref);
    map[a].total++; map[a].faixas[faixaIdx(g)]++;
    if (g > 0) map[a].venc++;
    if (isControle(r)) map[a].ctrl++;
  });
  return Object.values(map).sort(porVencidos);
}

/* ---------------- métricas de fluxo por atendimento (aba Previsão) ---------------- */
const JANELA = 20;
function novoAcum(a) {
  return { at: a, total: 0, venc: 0, ent: 0, ent5: 0, sai5: 0, sai20: 0, sai5ant: 0, entVenc: 0, saiVenc: 0, saiTot: 0, durSoma: 0, durN: 0 };
}

// D = data da posição; atual = usa abertoAgora (só para a referência)
export function metricasFluxo(D, atual) {
  const rows = baseRows(), m = {};
  const fim = fimJanela(D), ini20 = inicioJanela(fim, JANELA), ini5 = inicioJanela(fim, 5);
  const fimAnt = addDays(fim, -7), ini5ant = inicioJanela(fimAnt, 5);
  const get = a => (m[a] = m[a] || novoAcum(a));

  rows.forEach(r => {
    const a = atendName(r);
    const aberta = atual ? abertoAgora(r) : abertoEm(r, D);
    if (aberta) {
      const g = get(a);
      g.total++;
      if (vencidoEm(r, D)) g.venc++;
    }
    if (entrou(r, ini20, fim)) get(a).ent++;
    if (saiu(r, ini20, fim)) {
      const g = get(a);
      g.sai20++;
      const dur = r.dur !== null && r.dur !== undefined ? r.dur : busDays(r.dsolic, r.dentr);
      g.durSoma += dur; g.durN++;
    }
    if (saiu(r, ini5, fim)) get(a).sai5++;
    if (entrou(r, ini5, fim)) get(a).ent5++;
    if (saiu(r, ini5ant, fimAnt)) get(a).sai5ant++;
    if (entrouEmVencido(r, ini20, fim)) get(a).entVenc++;
    if (saiuVencida(r, ini20, fim)) get(a).saiVenc++;
    if (entre(r.dentr, ini20, fim)) get(a).saiTot++;
  });

  return Object.values(m).map(calcularFluxo);
}

// transforma contagens em taxas e indicadores (também usado no total)
// Zerar vencidos em 1 semana: precisa entregar os vencidos de hoje + os que vão vencer durante a semana
// (ritmo histórico de entrada em vencido). A mais/dia = (vencidos + entrada em vencido × 5) ÷ 5 − saída de vencidos/dia.
export function calcularFluxo(g) {
  const entrada = g.ent / JANELA, saida = g.sai20 / JANELA, saida5 = g.sai5 / 5, saida5ant = g.sai5ant / 5;
  // saldo do momento: saída e entrada dos mesmos últimos 5 D.U.
  const entrada5 = g.ent5 / 5;
  const saldo = saida5 - entrada5;
  const entradaVenc = g.entVenc / JANELA, saidaVenc = g.saiVenc / JANELA, saldoVenc = saidaVenc - entradaVenc;
  const sla = g.durN ? g.durSoma / g.durN : null;
  const aMaisDia = (g.venc + entradaVenc * 5) / 5 - saidaVenc;
  const fila = sla !== null ? entrada * sla : null;
  // giro (lei de Little): dias úteis médios que uma troca fica vencida até ser entregue
  const giroVenc = saidaVenc > 0 ? g.venc / saidaVenc : null;
  return {
    ...g, entrada, entrada5, saida, saida5, saida5ant, saldo, entradaVenc, saidaVenc, saldoVenc, giroVenc, sla, aMaisDia,
    pctForaPrazo: g.saiTot ? g.saiVenc / g.saiTot : 0,
    aMaisSemana: aMaisDia * 5,
    prevVenc: saldoVenc > 0 ? Math.ceil(g.venc / saldoVenc) : null,
    fila, excesso: fila !== null ? g.total - fila : null,
  };
}

// soma os acumulados de vários atendimentos (linha de total)
export function somarFluxo(lista) {
  const t = novoAcum('Total');
  lista.forEach(g => Object.keys(t).forEach(k => { if (k !== 'at') t[k] += g[k]; }));
  return calcularFluxo(t);
}
