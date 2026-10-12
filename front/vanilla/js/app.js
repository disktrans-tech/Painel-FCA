// js/app.js — ponto de entrada. Só orquestra: chama api.js e ui.js.
// Regra de negócio sensível e validação de autorização NUNCA ficam aqui —
// isso é responsabilidade do backend.

import { verificarSaude } from "./api.js";
import { mostrarResultado, desabilitarBotao } from "./ui.js";

function iniciar() {
  const botao = document.getElementById("botao-testar-api");
  const resultado = document.getElementById("resultado-teste-api");

  if (!botao || !resultado) return;

  botao.addEventListener("click", async () => {
    desabilitarBotao(botao, true);
    mostrarResultado(resultado, "Chamando a API...", "info");

    try {
      const dados = await verificarSaude();
      mostrarResultado(resultado, `API respondeu: ${dados.status}`, "sucesso");
    } catch (erro) {
      // Mensagem amigável ao usuário; detalhe técnico só no console local.
      console.error(erro);
      mostrarResultado(resultado, "Não foi possível conectar à API.", "erro");
    } finally {
      desabilitarBotao(botao, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", iniciar);
