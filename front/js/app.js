// Ponto de entrada: carrega data/trocas.json e liga os controles
import { fmtDate, addDays, d0 } from './datas.js';
import { state } from './regras.js';
import { renderResumo, renderAtend, renderPrev, renderSemanal, renderMensal } from './views.js';

const $ = s => document.querySelector(s);
const VIEWS = { resumo: renderResumo, atend: renderAtend, prev: renderPrev, sem: renderSemanal, mes: renderMensal };

function render() {
  $('#view').replaceChildren(VIEWS[state.tab]());
}

function setCover() {
  const cover = $('#cover');
  cover.textContent = '';
  const partes = [
    ['Base: ', state.rows.length.toLocaleString('pt-BR') + ' trocas'],
    [' · em aberto: ', state.rows.filter(r => r.aberta).length.toLocaleString('pt-BR')],
    [' · atualizada em ', state.geradoEm],
    [' · referência ', fmtDate(state.ref)],
  ];
  partes.forEach(([rotulo, valor]) => {
    cover.append(rotulo);
    const b = document.createElement('b');
    b.textContent = valor;
    cover.append(b);
  });
}

function decode(json) {
  const epoch = new Date(json.epoch + 'T00:00:00');
  const dia = n => (n === null ? null : d0(addDays(epoch, n)));
  return json.rows.map(([a, ds, pz, de, sr, ab]) => ({
    conc: json.atendimentos[a],
    dsolic: dia(ds), prazo: dia(pz), dentr: dia(de),
    srom: json.status_romaneio[sr], aberta: ab === 1,
  }));
}

async function carregar() {
  try {
    const resp = await fetch('data/trocas.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();
    state.rows = decode(json);
    const g = new Date(json.gerado_em);
    state.geradoEm = fmtDate(g) + ' ' + String(g.getHours()).padStart(2, '0') + ':' + String(g.getMinutes()).padStart(2, '0');
    $('#app').hidden = false;
    setCover();
    render();
  } catch (err) {
    $('#cover').textContent = 'Não foi possível carregar a base. Tente recarregar a página.';
    $('#cover').classList.add('erro');
  }
}

function ligarSegmento(id, chave) {
  $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    $(id).querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state[chave] = b.dataset[chave === 'tab' ? 't' : 'v'];
    if (state.rows.length) render();
  }));
}

const ref = $('#refdate');
const hoje = new Date();
ref.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
ref.addEventListener('change', () => {
  const [y, m, d] = ref.value.split('-').map(Number);
  state.ref = y ? new Date(y, m - 1, d) : d0(new Date());
  if (state.rows.length) { setCover(); render(); }
});

ligarSegmento('#scope', 'scope');
ligarSegmento('#ctrl', 'ctrl');
ligarSegmento('#tabs', 'tab');
carregar();
