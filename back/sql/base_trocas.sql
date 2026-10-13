-- Base do Painel FCA: troca (T), troca de modelo (M) e envio (E), sem dado de cliente.
-- Em aberto (qualquer data) + abertas ou entregues a partir de 01/08/2026.
-- data_entrega: data_finalizacao_efetiva; se vazia, data_entrega_solicitacao (desde que não seja futura).
-- dur_du: duracao_atendimento_dias_uteis do gold (SLA realizado), só para finalizadas.
WITH t AS (
  SELECT filial, data_solicitacao, data_prazo_entrega, data_finalizacao_efetiva,
         data_entrega_solicitacao, status_romaneio, status_linha, duracao_atendimento_dias_uteis
  FROM disktrans_gold.operacional.gld_fato_trocas
  WHERE data_solicitacao >= '2026-04-01'
    AND codigo_tipo_solicitacao IN ('T','M','E')
    AND (status_linha = 'Aberta' OR data_solicitacao >= '2026-08-01'
         OR data_finalizacao_efetiva >= '2026-08-01' OR data_entrega_solicitacao >= '2026-08-01')
  UNION ALL
  SELECT filial, data_solicitacao, data_prazo_entrega, data_finalizacao_efetiva,
         data_entrega_solicitacao, status_romaneio, status_linha, duracao_atendimento_dias_uteis
  FROM disktrans_gold.operacional.gld_fato_trocas
  WHERE data_solicitacao >= '2023-01-01' AND data_solicitacao < '2026-04-01'
    AND codigo_tipo_solicitacao IN ('T','M','E') AND status_linha = 'Aberta'
)
SELECT u.nome_fantasia AS concessionaria,
       t.data_solicitacao AS data_solic,
       t.data_prazo_entrega AS prazo,
       CASE
         WHEN t.status_linha = 'Aberta' THEN NULL
         WHEN t.data_finalizacao_efetiva IS NOT NULL THEN t.data_finalizacao_efetiva
         WHEN t.data_entrega_solicitacao <= CAST(GETDATE() AS date) THEN t.data_entrega_solicitacao
       END AS data_entrega,
       t.status_romaneio, t.status_linha,
       CASE WHEN t.status_linha = 'Finalizada' THEN t.duracao_atendimento_dias_uteis END AS dur_du
FROM t LEFT JOIN disktrans_gold.dbo.gld_dim_unidade_negocio u ON u.filial_sistema = t.filial
