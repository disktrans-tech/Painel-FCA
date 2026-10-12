package com.disktrans.template.exemplo;

/**
 * Formato de dados que sai da API — cada endpoint retorna só os campos
 * que a tela usa (nunca "SELECT *" disfarçado em JSON). Isso é
 * minimização de dados pessoais (LGPD).
 */
public record SaudeResposta(String status, String ambiente) {
}
