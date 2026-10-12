// src/api.js — toda comunicação com o backend passa por aqui.
// Nenhum outro arquivo do frontend deve montar URLs de API diretamente.

import { CONFIG } from "./config.js";

/**
 * Wrapper central de chamadas HTTP à API.
 * Lança erro tratável em vez de deixar a Promise sem catch.
 */
async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${CONFIG.API_BASE_URL}${caminho}`, {
    headers: {
      "Content-Type": "application/json",
      ...opcoes.headers,
    },
    ...opcoes,
  });

  if (!resposta.ok) {
    // Nunca exponha detalhes técnicos crus na tela — trate no chamador.
    throw new Error(`Erro na API (${resposta.status}) ao chamar ${caminho}`);
  }

  return resposta.json();
}

/**
 * Exemplo de chamada — troque por endpoints reais do projeto.
 */
export async function verificarSaude() {
  return requisitar("/api/saude");
}
