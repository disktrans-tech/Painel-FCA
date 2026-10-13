// Abas "Por atendimento" (heatmap de aging) e "Previsão de saída" (fluxo, esforço e fila)
import { fmtDate, addDays, addBusDays } from './datas.js';
import {
  state, FAIXAS, faixasVisiveis, baseRows, atendName, saiu, aggAtend, dailyRate, metricasFluxo, somarFluxo,
} from './regras.js';
import { el, tabela, card } from './dom.js';
import { n0, n1, pct, frag, td, b, muted, heat, tri, kpi, kpis, legendaFaixas } from './componentes.js';

/* ============================ POR ATENDIMENTO ============================ */
export function renderAtend() {
  const data = aggAtend();
  const rows = baseRows();
  const r20 = dailyRate(rows, 20);
  const ratePer = {};
  rows.forEach(r => { if (saiu(r, r20.start, r20.end)) { const a = atendName(r); ratePer[a] = (ratePer[a] || 0) + 1; } });

  const faixas = faixasVisiveis();
  const idxs = faixas.map(f => FAIXAS.indexOf(f));
  const tot = { faixas: Array(FAIXAS.length).fill(0), total: 0, venc: 0, ctrl: 0 };
  const linhas = data.map(d => {
    d.faixas.forEach((v, i) => { tot.faixas[i] += v; });
    tot.total += d.total; tot.venc += d.venc; tot.ctrl += d.ctrl;
    const rate = (ratePer[d.at] || 0) / 20;
    const prev = rate > 0 ? Math.ceil(d.total / rate) : null;
    return [d.at, ...idxs.map(i => heat(d.faixas[i], i, FAIXAS[i].color)), b(n0(d.total)), td(n0(d.venc), 'up'),
      pct(d.venc, d.total) + '%', td(n0(d.ctrl), 'muted'), prev !== null ? prev : muted('s/ ritmo')];
  });
  const rodape = ['Total', ...idxs.map(i => n0(tot.faixas[i])), n0(tot.total), n0(tot.venc), pct(tot.venc, tot.total) + '%', n0(tot.ctrl), '—'];

  return frag(card('Backlog por atendimento × aging (dias úteis de atraso)',
    'Ordenado por vencidos (maior → menor). "Prev." = dias úteis para zerar o aberto pela média de entrega do próprio atendimento (20 D.U.).',
    legendaFaixas(faixas),
    tabela(['Atendimento', ...faixas.map(f => f.k), 'Aberto', 'Venc.', '% Venc.', 'Ctrl.', 'Prev. (D.U.)'], linhas, rodape)));
}

/* ============================ PREVISÃO DE SAÍDA ============================ */
const prevDias = (qtd, rate) => (rate > 0 ? Math.ceil(qtd / rate) : null);
const celDias = d => (d !== null ? d + ' D.U.' : muted('s/ ritmo'));
const celZera = d => td(d !== null ? fmtDate(addBusDays(state.ref, d)) : '—', 'muted');
const celTri = (valor, ...tris) => el('td', {}, valor, tris.filter(Boolean).map(t => [' ', t]));

function celAMais(g) {
  if (!g.venc) return [td('—', 'muted'), td('—', 'muted')];
  if (g.aMaisDia <= 0) return [td('ritmo já zera', 'down'), td('—', 'muted')];
  return [td('+' + n1(g.aMaisDia), 'up'), td('+' + n0(g.aMaisSemana), 'up')];
}
function celPrevVenc(g) {
  if (!g.venc) return td('—', 'muted');
  if (g.prevVenc === null) return td('não zera', 'up');
  return g.prevVenc + ' D.U.';
}
function celExcesso(g, ant) {
  if (g.excesso === null) return td('—', 'muted');
  const t = tri(g.excesso, ant ? ant.excesso : null, false, 'excesso hoje × mesma data da semana anterior');
  return el('td', { class: g.excesso > 0 ? 'up' : 'down' }, (g.excesso > 0 ? '+' : '') + n0(g.excesso), t ? [' ', t] : null);
}

function linhaFluxo(g, ant) {
  const p5 = prevDias(g.total, g.saida5), p20 = prevDias(g.total, g.saida);
  return [
    g.at,
    celTri(b(n0(g.total)), tri(g.total, ant ? ant.total : null, false, 'em aberto hoje × mesma data da semana anterior')),
    td(n0(g.venc), 'up'),
    celTri(n1(g.saida5),
      tri(g.saida5, g.saida, true, 'ritmo recente (5 D.U.) × ritmo do mês (20 D.U.)'),
      tri(g.saida5, g.saida5ant, true, 'últimos 5 D.U. × os 5 D.U. da semana anterior')),
    celDias(p5), celZera(p5),
    n1(g.saida), celDias(p20), celZera(p20),
    n1(g.entrada),
    td((g.saldo > 0 ? '+' : '') + n1(g.saldo), g.saldo > 0 ? 'down' : g.saldo < 0 ? 'up' : 'muted'),
    n1(g.entradaVenc), n1(g.saidaVenc),
    celPrevVenc(g),
    ...celAMais(g),
    g.sla !== null ? n1(g.sla) + ' D.U.' : td('—', 'muted'),
    g.fila !== null ? n0(g.fila) : td('—', 'muted'),
    celExcesso(g, ant),
  ];
}

export function renderPrev() {
  const V = state.soVenc;
  const atual = metricasFluxo(state.ref, true).filter(g => g.total || g.sai20 || g.ent);
  const anterior = {};
  metricasFluxo(addDays(state.ref, -7), false).forEach(g => { anterior[g.at] = g; });
  atual.sort((x, y) => (y.total - x.total) || (y.venc - x.venc));
  const tot = somarFluxo(atual);
  const totAnt = somarFluxo(Object.values(anterior));

  const t5 = prevDias(tot.total, tot.saida5), t20 = prevDias(tot.total, tot.saida);
  const rotEnt = V ? 'Entrada em vencido/dia' : 'Entrada média/dia';
  const rotSai = V ? 'Saída de vencidos' : 'Saída';

  const cab = ['Atendimento', V ? 'Vencidos' : 'Em aberto', 'Venc.',
    `${rotSai}/dia (5 D.U.)`, 'Prev. recente', 'Zera ~',
    `${rotSai} média/dia (20 D.U.)`, 'Prev. mensal', 'Zera ~',
    rotEnt, 'Saldo/dia', 'Entram em vencido/dia', 'Saída de vencidos/dia', 'Prev. zerar vencidos',
    'A mais/dia (zerar em 1 sem.)', 'A mais na semana',
    'SLA realizado', 'Fila compatível', 'Excesso de fila'];

  return frag(
    kpis(null,
      kpi(V ? 'Vencidos' : 'Em aberto', n0(tot.total), 'semana anterior: ' + n0(totAnt.total)),
      kpi(`${rotSai} recente (5 D.U.)`, n1(tot.saida5) + '/dia', 'semana anterior: ' + n1(tot.saida5ant) + '/dia'),
      kpi(`${rotSai} mensal (20 D.U.)`, n1(tot.saida) + '/dia', n0(tot.sai20) + ' entregas'),
      kpi(rotEnt, n1(tot.entrada) + '/dia', n0(tot.ent) + ' em 20 D.U.'),
      kpi('Saldo/dia', (tot.saldo > 0 ? '+' : '') + n1(tot.saldo), tot.saldo > 0 ? 'backlog caindo' : 'backlog crescendo', tot.saldo > 0 ? 'good' : 'alert'),
      kpi('Vencidos: entram × saem/dia', n1(tot.entradaVenc) + ' × ' + n1(tot.saidaVenc), Math.abs(tot.saldoVenc) < 1 ? 'vencidos estáveis' : tot.saldoVenc > 0 ? 'vencidos diminuindo' : 'vencidos aumentando', tot.saldoVenc > 0 ? 'good' : 'alert'),
      kpi('A mais/dia p/ zerar vencidos em 1 semana', tot.aMaisDia > 0 ? '+' + n1(tot.aMaisDia) : '0', tot.aMaisDia > 0 ? '+' + n0(tot.aMaisSemana) + ' na semana' : 'ritmo atual já zera', tot.aMaisDia > 0 ? 'alert' : 'good'),
      kpi('Prev. otimista (recente)', t5 !== null ? t5 + ' D.U.' : '—', t5 !== null ? '~' + fmtDate(addBusDays(state.ref, t5)) : '', 'good'),
      kpi('Prev. conservadora (mensal)', t20 !== null ? t20 + ' D.U.' : '—', t20 !== null ? '~' + fmtDate(addBusDays(state.ref, t20)) : ''),
    ),
    card('Previsão de saída por atendimento',
      'Ordenado por em aberto (maior → menor). Taxas por dia útil; janela termina no último dia completo da base. ▲ verde = melhorou · ▼ vermelho = piorou (passe o mouse no triângulo para ver a comparação).',
      tabela(cab, atual.map(g => linhaFluxo(g, anterior[g.at])), linhaFluxo(tot, totAnt)),
      el('div', { class: 'note' },
        el('p', {}, b('Prev. recente / mensal: '), 'em aberto ÷ saída por dia (sem considerar novas entradas).'),
        el('p', {}, b('Saldo/dia: '), 'saída média − entrada média (20 D.U.). Positivo = backlog caindo.'),
        el('p', {}, b('Fluxo dos vencidos (20 D.U.): '), '"Entram em vencido" = trocas que passaram do prazo sem entrega; "Saída de vencidos" = entregas feitas após o prazo. ',
          b('Prev. zerar vencidos'), ' = vencidos ÷ (saída de vencidos − entrada em vencido); "não zera" quando entra mais do que sai.'),
        el('p', {}, b('A mais/dia: '), 'para zerar em 1 semana é preciso entregar os vencidos de hoje + os que vão vencer durante a semana (ritmo de entrada em vencido × 5). A mais/dia = esse total ÷ 5 − saída de vencidos/dia.'),
        el('p', {}, b('SLA realizado: '), 'média de dias úteis da abertura à entrega das trocas entregues nos últimos 20 D.U. (campo do gold). ',
          b('Fila compatível'), ' = entrada média/dia × SLA realizado. ', b('Excesso'), ' = em aberto − fila compatível.'),
        V ? el('p', {}, b('Só vencidos: '), 'saída = entregas feitas após o prazo; entrada = trocas que passaram a estar vencidas.') : null,
      )),
  );
}
