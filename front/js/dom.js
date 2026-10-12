// Criação de elementos sem innerHTML: todo texto entra como textContent (sem risco de XSS).

// el('td', { class: 'up', style: { background: 'red' } }, 'texto', outroNo, [lista])
export function el(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') no.className = v;
    else if (k === 'style') Object.assign(no.style, v);
    else no.setAttribute(k, v);
  });
  anexar(no, filhos);
  return no;
}

function anexar(no, filhos) {
  filhos.flat(Infinity).forEach(f => {
    if (f === null || f === undefined || f === false) return;
    no.append(f instanceof Node ? f : document.createTextNode(String(f)));
  });
}

// tabela simples: cabecalho = ['A', 'B'], linhas = [[celula, ...]], rodape opcional
export function tabela(cabecalho, linhas, rodape = null) {
  const td = c => (c instanceof Node && c.tagName === 'TD' ? c : el('td', {}, c));
  return el('div', { class: 'tabscroll' },
    el('table', {},
      el('thead', {}, el('tr', {}, cabecalho.map(h => el('th', {}, h)))),
      el('tbody', {}, linhas.map(l => el('tr', {}, l.map(td)))),
      rodape ? el('tfoot', {}, el('tr', {}, rodape.map(td))) : null,
    ),
  );
}

export function card(titulo, descricao, ...conteudo) {
  return el('div', { class: 'card' }, el('h2', {}, titulo), descricao ? el('p', { class: 'card__desc' }, descricao) : null, conteudo);
}
