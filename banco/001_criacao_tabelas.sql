-- =========================================================
-- Script de criação de estrutura do banco.
-- Este arquivo SÓ contém DDL (CREATE TABLE, índices, constraints).
-- NUNCA adicione aqui INSERTs com dados reais de clientes/colaboradores.
-- Para dados de exemplo/teste, use banco/seeds/ com dados FICTÍCIOS.
-- =========================================================

-- Exemplo de tabela — substitua pelo modelo real do projeto.
CREATE TABLE IF NOT EXISTS exemplo_tabela (
    id            BIGSERIAL PRIMARY KEY,
    nome          VARCHAR(200) NOT NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE exemplo_tabela IS 'Tabela de exemplo — apague quando criar as tabelas reais do projeto.';

-- Numere os próximos scripts em ordem (002_..., 003_...) para manter
-- um histórico legível de como o banco evoluiu.
