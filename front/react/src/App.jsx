// src/App.jsx — orquestra a tela: chama api.js e renderiza o estado.
// Regra de negócio sensível e validação de autorização NUNCA ficam aqui —
// isso é responsabilidade do backend.
// Nunca use dangerouslySetInnerHTML com dado de usuário/API (risco de XSS)
// — JSX já escapa texto por padrão, use isso a seu favor.

import { useState } from "react";

import { verificarSaude } from "./api.js";

export default function App() {
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function testarApi() {
    setCarregando(true);
    setResultado({ tipo: "info", texto: "Chamando a API..." });

    try {
      const dados = await verificarSaude();
      setResultado({ tipo: "sucesso", texto: `API respondeu: ${dados.status}` });
    } catch (erro) {
      // Mensagem amigável ao usuário; detalhe técnico só no console local.
      console.error(erro);
      setResultado({ tipo: "erro", texto: "Não foi possível conectar à API." });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <header className="cabecalho">
        <h1>Nome do Projeto</h1>
      </header>

      <main className="conteudo">
        <section className="secao-exemplo" aria-labelledby="titulo-exemplo">
          <h2 id="titulo-exemplo">Exemplo de integração com a API</h2>
          <p>
            Este bloco existe só para provar que o frontend consegue falar com o backend.
            Substitua por telas reais do projeto.
          </p>

          <button
            type="button"
            className="botao botao--primario"
            onClick={testarApi}
            disabled={carregando}
          >
            Testar conexão com a API
          </button>

          {resultado && (
            <p role="status" aria-live="polite" data-tipo={resultado.tipo}>
              {resultado.texto}
            </p>
          )}
        </section>
      </main>

      <footer className="rodape">
        <p>Disktrans</p>
      </footer>
    </>
  );
}
