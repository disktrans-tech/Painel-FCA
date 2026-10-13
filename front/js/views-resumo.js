// Aba Resumo: cards, faixa ≥ 5 D.U., distribuição do aging e Leitura FCA
import { fmtDate, addDays, addBusDays } from './datas.js';
import {
  state, FAIXAS, faixasVisiveis, faixaIdx, baseRows, abertoAgora, abertoEm, agingOf, vencidoEm,
  isControle, dailyRate, fimJanela, inicioJanela, saiu, entrou,
} from './regras.js';
import { el, tabela, card } from './dom.js';
import { n0, n1, pct, frag, td, b, heat, varPill, kpi, kpis } from './componentes.js';

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function previsao(qtd, perDay) {
  if (!(perDay > 0)) return { num: '—', hint: 'sem entregas na janela' };
  const dias = Math.ceil(qtd / perDay);
  return { num: dias + ' D.U.', hint: '~' + fmtDate(addBusDays(state.ref, dias)) };
}

// ritmo de saída do grupo ≥ 5 D.U.: entregas feitas com 5 ou mais D.U. de atraso
function ritmoAtraso5(rows, nBus) {
  const fim = fimJanela(state.ref), ini = inicioJanela(fim, nBus);
  let c = 0;
  rows.forEach(x => { if (saiu(x, ini, fim) && x.atrasoEntrega >= 5) c++; });
  return c / nBus;
}

export function renderResumo() {
  const rows = baseRows(), ref = state.ref, V = state.soVenc;
  const open = rows.filter(abertoAgora);
  const total = open.length;
  const vencidos = open.filter(r => vencidoEm(r, ref));
  const venc = vencidos.length;
  const ctrl = open.filter(isControle).length;
  const vencCtrl = vencidos.filter(isControle).length;
  const r5 = dailyRate(rows, 5), r20 = dailyRate(rows, 20);
  const p5 = previsao(total, r5.perDay), p20 = previsao(total, r20.perDay);

  const linha1 = kpis(null,
    kpi(V ? 'Vencidos em aberto' : 'Em aberto (T/M/E)', n0(total), 'posição em ' + fmtDate(ref)),
    V ? null : kpi('Vencidos (D.U.)', n0(venc), pct(venc, total) + '% do aberto', 'alert'),
    V ? null : kpi('Em dia', n0(total - venc), pct(total - venc, total) + '% do aberto', 'good'),
    kpi('Controle de entrega', n0(ctrl), 'já vão sair'),
    kpi('Vencidos em controle', pct(vencCtrl, venc) + '%', `${n0(vencCtrl)} de ${n0(venc)} vencidos já em rota`),
    kpi('Previsão zeragem (ritmo recente)', p5.num, p5.hint),
    kpi('Previsão zeragem (ritmo mensal)', p20.num, p20.hint),
  );

  const g5 = open.filter(r => agingOf(r, ref) >= 5);
  const ctrl5 = g5.filter(isControle).length;
  const q5 = previsao(g5.length, ritmoAtraso5(rows, 5)), q20 = previsao(g5.length, ritmoAtraso5(rows, 20));
  const linha2 = kpis('Atrasadas há 5 D.U. ou mais',
    kpi('Atrasadas ≥ 5 D.U.', n0(g5.length), pct(g5.length, total) + '% do ' + (V ? 'vencido' : 'aberto'), 'alert'),
    kpi('Controle de entrega', n0(ctrl5), pct(ctrl5, g5.length) + '% do grupo já em rota'),
    kpi('Previsão zeragem (ritmo recente)', q5.num, q5.hint),
    kpi('Previsão zeragem (ritmo mensal)', q20.num, q20.hint),
  );

  const faixas = faixasVisiveis();
  const fx = Array(FAIXAS.length).fill(0);
  open.forEach(r => { fx[faixaIdx(agingOf(r, ref))]++; });
  const idxs = faixas.map(f => FAIXAS.indexOf(f));

  return frag(
    linha1,
    linha2,
    el('p', { class: 'note' }, 'Ritmo do grupo ≥ 5 D.U. = entregas feitas com 5 ou mais dias úteis de atraso.'),
    card('Distribuição do aging (dias úteis de atraso)',
      V ? 'Só vencidos, por faixa de atraso.' : 'Backlog em aberto por faixa de atraso. "Em dia" = dentro do prazo; demais = vencidos.',
      tabela(['Faixa', ...faixas.map(f => f.k), 'Total'], [
        ['Equipamentos', ...idxs.map(i => heat(fx[i], i, FAIXAS[i].color)), b(n0(total))],
        [td('%', 'muted'), ...idxs.map(i => td(pct(fx[i], total) + '%', 'muted')), td('100%', 'muted')],
      ]),
      el('p', { class: 'note' }, 'Entregas na janela (até ', fmtDate(r5.end), '): últimos 5 D.U. = ', b(n0(r5.total)),
        ` (${n1(r5.perDay)}/dia) · últimos 20 D.U. = `, b(n0(r20.total)), ` (${n1(r20.perDay)}/dia).`),
    ),
    leituraFca(rows),
  );
}

/* Leitura FCA orgânica: hoje × mesmo dia da semana anterior; fluxo dos últimos 7 dias × 7 anteriores */
function leituraFca(rows) {
  const ref = state.ref, V = state.soVenc, ant = addDays(ref, -7);
  const diaSem = DIAS_SEMANA[ref.getDay()];
  const backNow = rows.filter(r => abertoEm(r, ref));
  const backAnt = rows.filter(r => abertoEm(r, ant));
  const vNow = backNow.filter(r => vencidoEm(r, ref)).length, vAnt = backAnt.filter(r => vencidoEm(r, ant)).length;

  const fim = fimJanela(ref), ini = addDays(fim, -6), fimA = addDays(fim, -7), iniA = addDays(fim, -13);
  const conta = (fn, a, z) => rows.filter(r => fn(r, a, z)).length;
  const entA = conta(entrou, iniA, fimA), entN = conta(entrou, ini, fim);
  const saiA = conta(saiu, iniA, fimA), saiN = conta(saiu, ini, fim);

  const dBack = backNow.length - backAnt.length;
  const efet = dBack < 0 ? 'SIM — backlog caiu' : dBack > 0 ? 'ATENÇÃO — backlog subiu' : 'estável';
  const cls = dBack < 0 ? 'down' : dBack > 0 ? 'up' : 'muted';
  const per = (a, z) => `${fmtDate(a)}–${fmtDate(z)}`;
  const rotBack = V ? 'Backlog vencido' : 'Backlog';
  const rotEnt = V ? 'Entraram em vencido' : 'Entradas (novas trocas)';
  const rotSai = V ? 'Entregas de vencidos' : 'Entregas';

  return card('Leitura FCA — a ação está sendo efetiva?',
    `Compara ${diaSem} ${fmtDate(ref)} com ${diaSem} ${fmtDate(ant)}. Fluxo: 7 dias até ${fmtDate(fim)} × 7 dias anteriores (último dia completo da base).`,
    tabela(['Indicador', `${diaSem} anterior`, 'Agora', 'Variação'], [
      [`${rotBack} (${fmtDate(ant)} → ${fmtDate(ref)})`, n0(backAnt.length), b(n0(backNow.length)), varPill(backNow.length, backAnt.length)],
      ['% vencido do backlog', pct(vAnt, backAnt.length) + '%', pct(vNow, backNow.length) + '%',
        (pct(vNow, backNow.length) - pct(vAnt, backAnt.length)) + ' p.p.'],
      [`${rotEnt} (${per(iniA, fimA)} × ${per(ini, fim)})`, n0(entA), n0(entN), varPill(entN, entA)],
      [`${rotSai} (${per(iniA, fimA)} × ${per(ini, fim)})`, n0(saiA), n0(saiN), varPill(saiN, saiA, true)],
      ['Saldo dos 7 dias (entregas − entradas)', n0(saiA - entA), b(n0(saiN - entN)), ''],
      ['Efetividade da ação', '', el('b', { class: cls }, efet), ''],
    ]));
}
