// Renderização das abas. Cada função devolve um DocumentFragment montado com el() (sem innerHTML).
import { fmtDate, addDays, addBusDays, startOfWeek, startOfMonth } from './datas.js';
import {
  state, FAIXAS, baseRows, openNow, openAt, agingOf, atendName, isControle, deliveredBetween,
  openedBetween, faixaIdx, aggAtend, sevAtDate, dailyRate, byAtraso,
} from './regras.js';
import { el, tabela, card } from './dom.js';

const n0 = x => (x || 0).toLocaleString('pt-BR');
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const frag = (...nos) => { const f = document.createDocumentFragment(); f.append(...nos.flat()); return f; };
const muted = t => el('span', { class: 'muted' }, t);
const semRitmo = () => muted('s/ ritmo');

function heat(v, max, color) {
  if (!v) return muted('·');
  const op = 0.25 + 0.75 * (max ? v / max : 0);
  return el('span', { class: 'cell', style: { background: color, opacity: op.toFixed(2) } }, n0(v));
}
function varPill(cur, prev) {
  const d = cur - prev;
  if (d === 0) return muted('=');
  return el('span', { class: d > 0 ? 'up' : 'down' }, `${d > 0 ? '▲' : '▼'} ${n0(Math.abs(d))}`);
}
const kpi = (lab, num, hint = '', mod = '') =>
  el('div', { class: 'kpi' + (mod ? ' kpi--' + mod : '') },
    el('div', { class: 'kpi__lab' }, lab), el('div', { class: 'kpi__num' }, num), el('div', { class: 'kpi__hint' }, hint));
const kpis = (...itens) => el('div', { class: 'kpis' }, itens);
const td = (conteudo, cls) => el('td', { class: cls }, conteudo);
const b = t => el('b', {}, t);

/* ============================ RESUMO ============================ */
export function renderResumo() {
  const rows = baseRows(), ref = state.ref;
  const open = rows.filter(openNow);
  const total = open.length;
  const venc = open.filter(r => agingOf(r, ref) > 0).length;
  const emdia = total - venc;
  const ctrl = open.filter(isControle).length;
  const r5 = dailyRate(rows, 5), r20 = dailyRate(rows, 20);
  const prev5 = r5.perDay > 0 ? Math.ceil(total / r5.perDay) : null;
  const prev20 = r20.perDay > 0 ? Math.ceil(total / r20.perDay) : null;

  const fx = Array(FAIXAS.length).fill(0);
  open.forEach(r => { fx[faixaIdx(agingOf(r, ref))]++; });
  const maxfx = Math.max(...fx, 1);

  return frag(
    kpis(
      kpi('Em aberto (trocas)', n0(total), 'posição em ' + fmtDate(ref)),
      kpi('Vencidos (D.U.)', n0(venc), pct(venc, total) + '% do aberto', 'alert'),
      kpi('Em dia', n0(emdia), pct(emdia, total) + '% do aberto', 'good'),
      kpi('Controle de entrega', n0(ctrl), 'já vão sair'),
      kpi('Previsão zeragem (ritmo recente)', prev5 ? prev5 + ' D.U.' : '—', prev5 ? '~' + fmtDate(addBusDays(ref, prev5)) : 'sem entregas recentes'),
      kpi('Previsão zeragem (ritmo mensal)', prev20 ? prev20 + ' D.U.' : '—', prev20 ? '~' + fmtDate(addBusDays(ref, prev20)) : '—'),
    ),
    card('Distribuição do aging (dias úteis)', 'Backlog em aberto por faixa de atraso. Faixa "Em dia" = dentro do prazo; demais = vencidos.',
      tabela(['Faixa', ...FAIXAS.map(f => f.k), 'Total'], [
        ['Equipamentos', ...fx.map((v, i) => heat(v, maxfx, FAIXAS[i].color)), b(n0(total))],
        [td('%', 'muted'), ...fx.map(v => td(pct(v, total) + '%', 'muted')), td('100%', 'muted')],
      ]),
      el('p', { class: 'note' }, 'Entregas na janela: últimos 5 D.U. = ', b(n0(r5.total)), ` (${r5.perDay.toFixed(1)}/dia) · últimos 20 D.U. = `, b(n0(r20.total)), ` (${r20.perDay.toFixed(1)}/dia).`),
    ),
    card('Leitura FCA — a ação está sendo efetiva?', 'A ação é efetiva quando o backlog e o % de vencidos caem semana a semana e a previsão de zeragem encurta.', fcaReadout(rows)),
  );
}

function fcaReadout(rows) {
  const ref = state.ref;
  const wCur = startOfWeek(ref), wPrev = addDays(wCur, -7), wPrevEnd = addDays(wCur, -1);
  const backNow = rows.filter(r => openAt(r, ref)).length;
  const backPrev = rows.filter(r => openAt(r, wPrevEnd)).length;
  const delCur = rows.filter(r => deliveredBetween(r, wCur, ref)).length;
  const delPrev = rows.filter(r => deliveredBetween(r, wPrev, wPrevEnd)).length;
  const dBack = backNow - backPrev;
  const efet = dBack < 0 ? 'SIM — backlog caiu' : dBack > 0 ? 'ATENÇÃO — backlog subiu' : 'estável';
  const cls = dBack < 0 ? 'down' : dBack > 0 ? 'up' : 'muted';
  const linhas = [
    ['Backlog fim da semana anterior', n0(backPrev)],
    ['Backlog agora (semana atual)', n0(backNow)],
    ['Variação do backlog', td((dBack > 0 ? '+' : '') + n0(dBack), cls)],
    ['Entregas semana anterior → atual', `${n0(delPrev)} → ${n0(delCur)}`],
    ['Efetividade da ação', el('b', { class: cls }, efet)],
  ];
  return el('table', {}, el('tbody', {}, linhas.map(l => el('tr', {}, l.map(c => (c instanceof Node && c.tagName === 'TD' ? c : el('td', {}, c)))))));
}

/* ============================ POR ATENDIMENTO ============================ */
export function renderAtend() {
  const data = aggAtend();
  const maxcell = Math.max(1, ...data.flatMap(d => d.faixas));
  const rows = baseRows();
  const r20 = dailyRate(rows, 20);
  const ratePer = {};
  rows.forEach(r => { if (deliveredBetween(r, r20.start, state.ref)) { const a = atendName(r); ratePer[a] = (ratePer[a] || 0) + 1; } });

  const legenda = el('div', { class: 'legend' }, FAIXAS.map(f => el('span', {}, el('i', { style: { background: f.color } }), f.k)));
  const tot = { faixas: Array(FAIXAS.length).fill(0), total: 0, venc: 0, ctrl: 0 };
  const linhas = data.map(d => {
    d.faixas.forEach((v, i) => { tot.faixas[i] += v; });
    tot.total += d.total; tot.venc += d.venc; tot.ctrl += d.ctrl;
    const rate = (ratePer[d.at] || 0) / 20;
    const prev = rate > 0 ? Math.ceil(d.total / rate) : null;
    return [d.at, ...d.faixas.map((v, i) => heat(v, maxcell, FAIXAS[i].color)), b(n0(d.total)), td(n0(d.venc), 'up'),
      pct(d.venc, d.total) + '%', td(n0(d.ctrl), 'muted'), prev !== null ? prev : semRitmo()];
  });
  const rodape = ['Total', ...tot.faixas.map(n0), n0(tot.total), n0(tot.venc), pct(tot.venc, tot.total) + '%', n0(tot.ctrl), '—'];

  return frag(card('Backlog por atendimento × aging (dias úteis)',
    'Agrupado por atendimento (concessionária / unidade). "Prev." = dias úteis estimados para zerar pela média de entrega do próprio atendimento (20 D.U.).',
    legenda,
    tabela(['Atendimento', ...FAIXAS.map(f => f.k), 'Aberto', 'Venc.', '% Venc.', 'Ctrl.', 'Prev. (D.U.)'], linhas, rodape)));
}

/* ============================ PREVISÃO ============================ */
export function renderPrev() {
  const rows = baseRows(), ref = state.ref;
  const total = rows.filter(openNow).length;
  const r5 = dailyRate(rows, 5), r20 = dailyRate(rows, 20);
  const mk = rate => (rate > 0 ? { dias: Math.ceil(total / rate), zero: addBusDays(ref, Math.ceil(total / rate)) } : null);
  const p5 = mk(r5.perDay), p20 = mk(r20.perDay);

  const del5 = {}, del20 = {};
  rows.forEach(r => {
    const a = atendName(r);
    if (deliveredBetween(r, r5.start, ref)) del5[a] = (del5[a] || 0) + 1;
    if (deliveredBetween(r, r20.start, ref)) del20[a] = (del20[a] || 0) + 1;
  });
  const linhas = aggAtend().map(d => {
    const a = d.at, o = d.total;
    const rt5 = (del5[a] || 0) / 5, rt20 = (del20[a] || 0) / 20;
    const d5 = rt5 > 0 ? Math.ceil(o / rt5) : null, d20 = rt20 > 0 ? Math.ceil(o / rt20) : null;
    return [a, b(n0(o)),
      rt5.toFixed(1), d5 !== null ? d5 + ' D.U.' : semRitmo(), td(d5 !== null ? fmtDate(addBusDays(ref, d5)) : '—', 'muted'),
      rt20.toFixed(1), d20 !== null ? d20 + ' D.U.' : semRitmo(), td(d20 !== null ? fmtDate(addBusDays(ref, d20)) : '—', 'muted')];
  });

  return frag(
    kpis(
      kpi('Em aberto', n0(total)),
      kpi('Ritmo recente (5 D.U.)', r5.perDay.toFixed(1) + '/dia', n0(r5.total) + ' entregas'),
      kpi('Ritmo mensal (20 D.U.)', r20.perDay.toFixed(1) + '/dia', n0(r20.total) + ' entregas'),
      kpi('Prev. otimista (recente)', p5 ? p5.dias + ' D.U.' : '—', p5 ? '~' + fmtDate(p5.zero) : '', 'good'),
      kpi('Prev. conservadora (mensal)', p20 ? p20.dias + ' D.U.' : '—', p20 ? '~' + fmtDate(p20.zero) : ''),
    ),
    card('Previsão de saída por atendimento',
      'Dias úteis estimados para zerar o backlog = em aberto ÷ média de entregas por dia útil. Cenário recente (5 D.U.) × conservador (20 D.U.).',
      tabela(['Atendimento', 'Em aberto', 'Entr./dia (5 D.U.)', 'Prev. recente', 'Zera ~', 'Entr./dia (20 D.U.)', 'Prev. mensal', 'Zera ~'], linhas),
      el('p', { class: 'note' }, 'Previsão assume ritmo constante e sem novas aberturas. Atendimentos "s/ ritmo" não tiveram entregas na janela — exigem ação específica.')),
  );
}

/* ============================ SEMANAL / MENSAL ============================ */
function periodStats(rows, start, end) {
  const back = rows.filter(r => openAt(r, end));
  return {
    back: back.length,
    venc: back.filter(r => agingOf(r, end) > 0).length,
    open: rows.filter(r => openedBetween(r, start, end)).length,
    del: rows.filter(r => deliveredBetween(r, start, end)).length,
  };
}
function fluxoTabela(lPrev, lCur, sPrev, sCur, rot) {
  const dp = sCur.back && sPrev.back ? (pct(sCur.venc, sCur.back) - pct(sPrev.venc, sPrev.back)) + ' p.p.' : '—';
  return tabela(['Indicador', lPrev, lCur, 'Variação'], [
    [rot.open, n0(sPrev.open), n0(sCur.open), varPill(sCur.open, sPrev.open)],
    [rot.del, n0(sPrev.del), n0(sCur.del), varPill(sCur.del, sPrev.del)],
    [rot.back, b(n0(sPrev.back)), b(n0(sCur.back)), varPill(sCur.back, sPrev.back)],
    ['Vencidos no backlog', td(n0(sPrev.venc), 'up'), td(n0(sCur.venc), 'up'), varPill(sCur.venc, sPrev.venc)],
    ['% vencido', pct(sPrev.venc, sPrev.back) + '%', pct(sCur.venc, sCur.back) + '%', dp],
  ]);
}

// backlog por atendimento em duas datas, ordenado pelo maior atraso na data atual
function backlogPorAtend(rows, dPrev, dCur, entregaDe) {
  const m = {};
  const get = a => (m[a] = m[a] || { a, bp: 0, bc: 0, del: 0 });
  rows.forEach(r => {
    const a = atendName(r);
    if (openAt(r, dPrev)) get(a).bp++;
    if (openAt(r, dCur)) get(a).bc++;
  });
  if (entregaDe) rows.forEach(r => { const a = atendName(r); if (m[a] && deliveredBetween(r, entregaDe, dCur)) m[a].del++; });
  const sev = sevAtDate(dCur);
  return Object.values(m).map(d => {
    const s = sev[d.a] || { sev: 0, venc: 0 };
    return { ...d, sev: s.sev, venc: s.venc, total: d.bc };
  }).sort(byAtraso);
}

export function renderSemanal() {
  const rows = baseRows(), ref = state.ref;
  const wCur = startOfWeek(ref), wPrev = addDays(wCur, -7), wPrevEnd = addDays(wCur, -1);
  const sPrev = periodStats(rows, wPrev, wPrevEnd), sCur = periodStats(rows, wCur, ref);
  const saldo = sCur.open - sCur.del;

  const lista = backlogPorAtend(rows, wPrevEnd, ref, null);
  const totP = lista.reduce((s, r) => s + r.bp, 0), totC = lista.reduce((s, r) => s + r.bc, 0);
  const linhas = lista.map(r => {
    const sc = pct(r.bc, totC);
    return [r.a, n0(r.bp), td(pct(r.bp, totP) + '%', 'muted'), b(n0(r.bc)),
      el('td', {}, sc + '% ', el('span', { class: 'bar' }, el('i', { style: { width: sc + '%' } }))), varPill(r.bc, r.bp)];
  });

  return frag(
    card('Fluxo semanal — semana anterior × atual',
      `Semana anterior: ${fmtDate(wPrev)}–${fmtDate(wPrevEnd)} · Semana atual: ${fmtDate(wCur)}–${fmtDate(ref)} (parcial até a referência).`,
      fluxoTabela('Semana anterior', 'Semana atual', sPrev, sCur, { open: 'Aberturas (novas solicitações)', del: 'Entregas (saídas)', back: 'Backlog no fim da semana' }),
      el('p', { class: 'note' }, 'Saldo da semana atual = aberturas − entregas = ', b((saldo > 0 ? '+' : '') + n0(saldo)), '. Backlog cai quando entregas > aberturas.')),
    card('Share do backlog por atendimento — semana a semana',
      'Backlog carregado de uma semana para a outra e a participação (share) de cada atendimento no total.',
      tabela(['Atendimento', 'Backlog sem. ant.', 'Share ant.', 'Backlog sem. atual', 'Share atual', 'Variação'], linhas,
        ['Total', n0(totP), '100%', n0(totC), '100%', varPill(totC, totP)])),
  );
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function renderMensal() {
  const rows = baseRows(), ref = state.ref;
  const mCur = startOfMonth(ref), mPrevEnd = addDays(mCur, -1), mPrev = startOfMonth(mPrevEnd);
  const lblCur = MESES[mCur.getMonth()] + '/' + mCur.getFullYear(), lblPrev = MESES[mPrev.getMonth()] + '/' + mPrev.getFullYear();
  const sPrev = periodStats(rows, mPrev, mPrevEnd), sCur = periodStats(rows, mCur, ref);

  const linhas = backlogPorAtend(rows, mPrevEnd, ref, mCur)
    .map(r => [r.a, n0(r.bp), td(n0(r.del), 'down'), b(n0(r.bc)), varPill(r.bc, r.bp)]);

  return frag(
    card(`Comparativo mensal — ${lblPrev} × ${lblCur}`,
      `Mês anterior (fechado) × mês atual (parcial até ${fmtDate(ref)}). Backlog medido no fim de cada período.`,
      fluxoTabela(lblPrev, lblCur + ' (parcial)', sPrev, sCur, { open: 'Aberturas no mês', del: 'Entregas no mês', back: 'Backlog no fim' })),
    card(`Backlog por atendimento — ${lblPrev} × ${lblCur}`,
      'Evolução do passivo por atendimento entre o fim do mês anterior e a posição atual, com entregas no mês.',
      tabela(['Atendimento', `Backlog ${lblPrev}`, `Entregas ${lblCur}`, 'Backlog atual', 'Variação'], linhas)),
  );
}
