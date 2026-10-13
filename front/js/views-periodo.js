// Abas "Semanal + share" e "Mensal": fluxo do período e backlog por atendimento
import { fmtDate, addDays, startOfWeek, startOfMonth } from './datas.js';
import { state, baseRows, abertoEm, vencidoEm, entrou, saiu, atendName, porVencidos } from './regras.js';
import { el, tabela, card } from './dom.js';
import { n0, pct, frag, td, b, varPill } from './componentes.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function rotulos() {
  return state.soVenc
    ? { open: 'Entraram em vencido', del: 'Entregas de vencidos', back: 'Backlog vencido no fim' }
    : { open: 'Entradas (novas trocas)', del: 'Entregas (saídas)', back: 'Backlog no fim' };
}

function periodStats(rows, start, end) {
  const back = rows.filter(r => abertoEm(r, end));
  return {
    back: back.length,
    venc: back.filter(r => vencidoEm(r, end)).length,
    open: rows.filter(r => entrou(r, start, end)).length,
    del: rows.filter(r => saiu(r, start, end)).length,
  };
}

function fluxoTabela(lPrev, lCur, sPrev, sCur) {
  const rot = rotulos();
  const dp = sCur.back && sPrev.back ? (pct(sCur.venc, sCur.back) - pct(sPrev.venc, sPrev.back)) + ' p.p.' : '—';
  return tabela(['Indicador', lPrev, lCur, 'Variação'], [
    [rot.open, n0(sPrev.open), n0(sCur.open), varPill(sCur.open, sPrev.open)],
    [rot.del, n0(sPrev.del), n0(sCur.del), varPill(sCur.del, sPrev.del, true)],
    [rot.back, b(n0(sPrev.back)), b(n0(sCur.back)), varPill(sCur.back, sPrev.back)],
    ['Vencidos no backlog', td(n0(sPrev.venc), 'up'), td(n0(sCur.venc), 'up'), varPill(sCur.venc, sPrev.venc)],
    ['% vencido', pct(sPrev.venc, sPrev.back) + '%', pct(sCur.venc, sCur.back) + '%', dp],
  ]);
}

// backlog por atendimento em duas datas, ordenado por vencidos na data atual (maior → menor)
function backlogPorAtend(rows, dPrev, dCur, entregaDe) {
  const m = {};
  const get = a => (m[a] = m[a] || { a, bp: 0, bc: 0, venc: 0, del: 0 });
  rows.forEach(r => {
    const a = atendName(r);
    if (abertoEm(r, dPrev)) get(a).bp++;
    if (abertoEm(r, dCur)) {
      const g = get(a);
      g.bc++;
      if (vencidoEm(r, dCur)) g.venc++;
    }
  });
  if (entregaDe) rows.forEach(r => { const a = atendName(r); if (m[a] && saiu(r, entregaDe, dCur)) m[a].del++; });
  return Object.values(m).map(d => ({ ...d, total: d.bc })).sort(porVencidos);
}

export function renderSemanal() {
  const rows = baseRows(), ref = state.ref;
  const wCur = startOfWeek(ref), wPrev = addDays(wCur, -7), wPrevEnd = addDays(wCur, -1);
  const sPrev = periodStats(rows, wPrev, wPrevEnd), sCur = periodStats(rows, wCur, ref);
  const saldo = sCur.del - sCur.open;

  const lista = backlogPorAtend(rows, wPrevEnd, ref, null);
  const totP = lista.reduce((s, r) => s + r.bp, 0), totC = lista.reduce((s, r) => s + r.bc, 0);
  const totV = lista.reduce((s, r) => s + r.venc, 0);
  const linhas = lista.map(r => {
    const sc = pct(r.bc, totC);
    return [r.a, n0(r.bp), td(pct(r.bp, totP) + '%', 'muted'), b(n0(r.bc)), td(n0(r.venc), 'up'),
      el('td', {}, sc + '% ', el('span', { class: 'bar' }, el('i', { style: { width: sc + '%' } }))), varPill(r.bc, r.bp)];
  });

  return frag(
    card('Fluxo semanal — semana anterior × atual',
      `Semana anterior: ${fmtDate(wPrev)}–${fmtDate(wPrevEnd)} · Semana atual: ${fmtDate(wCur)}–${fmtDate(ref)} (parcial até a referência).`,
      fluxoTabela('Semana anterior', 'Semana atual', sPrev, sCur),
      el('p', { class: 'note' }, 'Saldo da semana atual (entregas − entradas) = ', b((saldo > 0 ? '+' : '') + n0(saldo)), '. Backlog cai quando o saldo é positivo.')),
    card('Share do backlog por atendimento — semana a semana',
      'Ordenado por vencidos (maior → menor). Backlog no fim da semana anterior × agora e a participação de cada atendimento no total.',
      tabela(['Atendimento', 'Backlog sem. ant.', 'Share ant.', 'Backlog atual', 'Venc. atual', 'Share atual', 'Variação'], linhas,
        ['Total', n0(totP), '100%', n0(totC), n0(totV), '100%', varPill(totC, totP)])),
  );
}

export function renderMensal() {
  const rows = baseRows(), ref = state.ref;
  const mCur = startOfMonth(ref), mPrevEnd = addDays(mCur, -1), mPrev = startOfMonth(mPrevEnd);
  const lblCur = MESES[mCur.getMonth()] + '/' + mCur.getFullYear(), lblPrev = MESES[mPrev.getMonth()] + '/' + mPrev.getFullYear();
  const sPrev = periodStats(rows, mPrev, mPrevEnd), sCur = periodStats(rows, mCur, ref);

  const linhas = backlogPorAtend(rows, mPrevEnd, ref, mCur)
    .map(r => [r.a, n0(r.bp), td(n0(r.del), 'down'), b(n0(r.bc)), td(n0(r.venc), 'up'), varPill(r.bc, r.bp)]);

  return frag(
    card(`Comparativo mensal — ${lblPrev} × ${lblCur}`,
      `Mês anterior (fechado) × mês atual (parcial até ${fmtDate(ref)}). Backlog medido no fim de cada período.`,
      fluxoTabela(lblPrev, lblCur + ' (parcial)', sPrev, sCur)),
    card(`Backlog por atendimento — ${lblPrev} × ${lblCur}`,
      'Ordenado por vencidos (maior → menor). Evolução do passivo entre o fim do mês anterior e a posição atual, com entregas no mês.',
      tabela(['Atendimento', `Backlog ${lblPrev}`, `Entregas ${lblCur}`, 'Backlog atual', 'Venc. atual', 'Variação'], linhas)),
  );
}
