package com.disktrans.template.exemplo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller de exemplo — copie este padrão para os endpoints reais do
 * projeto e delete esta classe quando não precisar mais dela.
 *
 * Convenções:
 * - Regra de negócio e verificação de permissão ficam AQUI (backend),
 *   nunca no frontend.
 * - Toda entrada de usuário é validada (Bean Validation / DTOs dedicados).
 * - Toda query ao banco é parametrizada (nunca concatenar string em SQL).
 */
@RestController
@RequestMapping("/api")
public class ExemploController {

    @Value("${app.ambiente}")
    private String ambiente;

    /** Endpoint simples só para o frontend confirmar que a API está no ar. */
    @GetMapping("/saude")
    public SaudeResposta verificarSaude() {
        return new SaudeResposta("ok", ambiente);
    }

    // Exemplo de endpoint que consultaria o banco — injete um JdbcTemplate
    // no construtor e use query parametrizada, nunca concatenando valor de
    // usuário na string SQL:
    //
    // private final JdbcTemplate jdbcTemplate;
    //
    // @GetMapping("/exemplo-consulta")
    // public List<Map<String, Object>> exemploConsulta() {
    //     return jdbcTemplate.queryForList(
    //         "SELECT id, nome FROM exemplo_tabela LIMIT 50");
    // }
}
