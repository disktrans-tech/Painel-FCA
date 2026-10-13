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
const celTri = (valor, ...tris) => el('td', {}, valor, tris.filter(Boolean).map(t => [' ', t]));

// saldo inteiro com sinal: verde quando sai mais do que entra
function celSaldo(s) {
  const v = Math.round(s);
  return td((v > 0 ? '+' : '') + n0(v), v > 0 ? 'down' : v < 0 ? 'up' : 'muted');
}
function celAMais(g) {
  if (!g.venc) return td('—', 'muted');
  if (g.aMaisDia <= 0) return td('ritmo já zera', 'down');
  return td('+' + n1(g.aMaisDia), 'up');
}
function celPrevVenc(g) {
  const dica = `Entram em vencido: ${n1(g.entradaVenc)}/dia · saída de vencidos: ${n1(g.saidaVenc)}/dia (20 D.U.)`;
  if (!g.venc) return el('td', { class: 'muted', title: dica }, '—');
  if (g.prevVenc === null) return el('td', { class: 'up dica', title: dica }, 'não zera');
  if (g.prevVenc > 120) return el('td', { class: 'up dica', title: dica }, '> 120 D.U.');
  return el('td', { class: 'dica', title: dica }, g.prevVenc + ' D.U.');
}

function linhaFluxo(g, ant) {
  return [
    g.at,
    celTri(b(n0(g.total)), tri(g.total, ant ? ant.total : null, false, 'em aberto hoje × mesma data da semana anterior')),
    state.soVenc ? null : td(n0(g.venc), 'up'),
    celTri(n1(g.saida5),
      tri(g.saida5, g.saida, true, 'ritmo recente (5 D.U.) × ritmo do mês (20 D.U.)'),
      tri(g.saida5, g.saida5ant, true, 'últimos 5 D.U. × os 5 D.U. da semana anterior')),
    n1(g.saida),
    n1(g.entrada5),
    celSaldo(g.saldo),
    celPrevVenc(g),
    celAMais(g),
    g.sla !== null ? n1(g.sla) + ' D.U.' : td('—', 'muted'),
  ].filter(c => c !== null);
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
  const rotEnt = V ? 'Entrada em vencido/dia (5 D.U.)' : 'Entrada/dia (5 D.U.)';
  const rotSai = V ? 'Saída de vencidos' : 'Saída';

  const cab = ['Atendimento', V ? 'Vencidos' : 'Em aberto', V ? null : 'Venc.',
    `${rotSai}/dia (5 D.U.)`, `${rotSai} média/dia (20 D.U.)`,
    rotEnt, 'Saldo/dia', 'Prev. zerar vencidos',
    'A mais/dia (zerar em 1 sem.)', 'SLA realizado'].filter(Boolean);

  return frag(
    kpis(null,
      kpi(V ? 'Vencidos' : 'Em aberto', n0(tot.total), 'semana anterior: ' + n0(totAnt.total)),
      kpi(`${rotSai} recente (5 D.U.)`, n1(tot.saida5) + '/dia', 'semana anterior: ' + n1(tot.saida5ant) + '/dia'),
      kpi(`${rotSai} mensal (20 D.U.)`, n1(tot.saida) + '/dia', n0(tot.sai20) + ' entregas'),
      kpi(rotEnt, n1(tot.entrada5) + '/dia', n0(tot.ent5) + ' em 5 D.U.'),
      kpi('Saldo/dia (5 D.U.)', (Math.round(tot.saldo) > 0 ? '+' : '') + n0(Math.round(tot.saldo)), tot.saldo > 0 ? 'saída − entrada: backlog caindo' : 'saída − entrada: backlog crescendo', tot.saldo > 0 ? 'good' : 'alert'),
      kpi('Entregas fora do prazo', Math.round(tot.pctForaPrazo * 100) + '%',
        `~${n0(tot.entradaVenc)}/dia viram vencidas e ~${n0(tot.saidaVenc)}/dia saem · ` +
        (Math.abs(tot.saldoVenc) < 5 ? 'estoque parado' : tot.saldoVenc > 0 ? 'estoque caindo' : 'estoque subindo'), 'alert'),
      kpi('Giro do vencido', tot.giroVenc !== null ? '~' + n1(tot.giroVenc) + ' D.U.' : '—', 'tempo médio que uma troca fica vencida até sair'),
      kpi('A mais/dia p/ zerar vencidos em 1 semana', tot.aMaisDia > 0 ? '+' + n1(tot.aMaisDia) : '0', tot.aMaisDia > 0 ? '+' + n0(tot.aMaisSemana) + ' na semana' : 'ritmo atual já zera', tot.aMaisDia > 0 ? 'alert' : 'good'),
      kpi('Prev. otimista (recente)', t5 !== null ? t5 + ' D.U.' : '—', t5 !== null ? '~' + fmtDate(addBusDays(state.ref, t5)) : '', 'good'),
      kpi('Prev. conservadora (mensal)', t20 !== null ? t20 + ' D.U.' : '—', t20 !== null ? '~' + fmtDate(addBusDays(state.ref, t20)) : ''),
    ),
    card('Previsão de saída por atendimento',
      'Ordenado por em aberto (maior → menor). Taxas por dia útil; janela termina no último dia completo da base. ▲ verde = melhorou · ▼ vermelho = piorou (passe o mouse no triângulo para ver a comparação).',
      tabela(cab, atual.map(g => linhaFluxo(g, anterior[g.at])), linhaFluxo(tot, totAnt)),
      el('div', { class: 'note' },
        el('p', {}, b('Saldo/dia: '), 'saída/dia (5 D.U.) − entrada/dia (5 D.U.), em número inteiro. Positivo = sai mais do que entra (backlog caindo).'),
        el('p', {}, b('Fluxo dos vencidos (20 D.U.): '), '"Entram em vencido" = trocas que passaram do prazo sem entrega; "Saída de vencidos" = entregas feitas após o prazo. ',
          b('Prev. zerar vencidos'), ' = vencidos ÷ (saída de vencidos − entrada em vencido); "não zera" quando entra mais do que sai. Passe o mouse para ver os dois ritmos.'),
        el('p', {}, b('A mais/dia: '), 'para zerar em 1 semana é preciso entregar os vencidos de hoje + os que vão vencer durante a semana (ritmo de entrada em vencido × 5). A mais/dia = esse total ÷ 5 − saída de vencidos/dia.'),
        el('p', {}, b('SLA realizado: '), 'média de dias úteis da abertura à entrega das trocas entregues nos últimos 20 D.U. (campo do gold).'),
        V ? el('p', {}, b('Só vencidos: '), 'saída = entregas feitas após o prazo; entrada = trocas que passaram a estar vencidas.') : null,
      )),
  );
}
