// src/config.js — VERSIONADO. Apenas configuração PÚBLICA.
// Nenhuma chave, token ou senha aqui — isso vive no backend (.env).
// O Vite só expõe ao navegador variáveis prefixadas com VITE_.

export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
};
