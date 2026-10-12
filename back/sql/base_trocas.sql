WITH t AS (
  SELECT filial, tipo_solicitacao, data_solicitacao, data_prazo_entrega,
         data_finalizacao_efetiva, status_romaneio, status_linha
  FROM disktrans_gold.operacional.gld_fato_trocas
  WHERE data_solicitacao >= '2026-04-01'
    AND codigo_tipo_solicitacao IN ('T','M')
    AND (status_linha = 'Aberta' OR data_solicitacao >= '2026-08-01' OR data_finalizacao_efetiva >= '2026-08-01')
  UNION ALL
  SELECT filial, tipo_solicitacao, data_solicitacao, data_prazo_entrega,
         data_finalizacao_efetiva, status_romaneio, status_linha
  FROM disktrans_gold.operacional.gld_fato_trocas
  WHERE data_solicitacao >= '2023-01-01' AND data_solicitacao < '2026-04-01'
    AND codigo_tipo_solicitacao IN ('T','M') AND status_linha = 'Aberta'
)
SELECT u.nome_fantasia AS concessionaria, t.tipo_solicitacao,
       t.data_solicitacao AS data_solic, t.data_prazo_entrega AS prazo,
       t.data_finalizacao_efetiva AS data_entrega, t.status_romaneio, t.status_linha
FROM t LEFT JOIN disktrans_gold.dbo.gld_dim_unidade_negocio u ON u.filial_sistema = t.filial
