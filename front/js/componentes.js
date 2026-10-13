// Componentes visuais reaproveitados pelas abas (todos montados com el(), sem innerHTML)
import { el } from './dom.js';

export const n0 = x => Math.round(x || 0).toLocaleString('pt-BR');
export const n1 = x => (x || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
export const frag = (...nos) => { const f = document.createDocumentFragment(); f.append(...nos.flat()); return f; };
export const muted = t => el('span', { class: 'muted' }, t);
export const td = (conteudo, cls) => el('td', { class: cls }, conteudo);
export const b = t => el('b', {}, t);

// célula do heatmap: cor da faixa; faixas claras (1 e 2-4 D.U.) usam texto escuro
export function heat(v, idxFaixa, color) {
  if (!v) return muted('·');
  const claro = idxFaixa === 1 || idxFaixa === 2;
  return el('span', { class: 'cell' + (claro ? ' cell--claro' : ''), style: { background: color } }, n0(v));
}

// variação absoluta com seta. Padrão: subir é ruim (backlog); maiorMelhor para entregas.
export function varPill(cur, prev, maiorMelhor = false) {
  const d = cur - prev;
  if (d === 0) return muted('=');
  const ruim = (d > 0) !== maiorMelhor;
  return el('span', { class: ruim ? 'up' : 'down' }, `${d > 0 ? '▲' : '▼'} ${n0(Math.abs(d))}`);
}

// triângulo de tendência. maiorMelhor: true para saída; false para backlog/excesso.
// Verde = melhorou, vermelho = piorou. title explica a comparação.
export function tri(cur, prev, maiorMelhor, titulo) {
  if (cur === null || prev === null || cur === undefined || prev === undefined) return null;
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return el('span', { class: 'tri tri--igual', title: titulo }, '=');
  const subiu = d > 0;
  const bom = subiu === maiorMelhor;
  return el('span', { class: 'tri ' + (bom ? 'tri--bom' : 'tri--ruim'), title: titulo }, subiu ? '▲' : '▼');
}

export const kpi = (lab, num, hint = '', mod = '') =>
  el('div', { class: 'kpi' + (mod ? ' kpi--' + mod : '') },
    el('div', { class: 'kpi__lab' }, lab), el('div', { class: 'kpi__num' }, num), el('div', { class: 'kpi__hint' }, hint));

export const kpis = (titulo, ...itens) =>
  el('section', { class: 'kpis-bloco' },
    titulo ? el('h3', { class: 'kpis-bloco__titulo' }, titulo) : null,
    el('div', { class: 'kpis' }, itens));

export const legendaFaixas = faixas =>
  el('div', { class: 'legend' }, faixas.map(f => el('span', {}, el('i', { style: { background: f.color } }), f.k)));
