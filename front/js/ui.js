// js/ui.js — funções de manipulação de tela (DOM).
// Nunca use innerHTML com dado vindo de usuário ou de API (risco de XSS).
// Use textContent ou createElement.

export function mostrarResultado(elemento, texto, tipo = "info") {
  elemento.textContent = texto;
  elemento.dataset.tipo = tipo;
}

export function desabilitarBotao(botao, desabilitado) {
  botao.disabled = desabilitado;
}
