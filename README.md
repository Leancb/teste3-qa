# teste3-qa · K6 + Relatórios + CI

Projeto de **teste de carga** com **K6** contra API pública (default: `JSONPlaceholder`). Gera relatórios em **`reports/`** e está pronto para **CI no GitHub**.

## Como roda
- Cenários: `smoke` (2 VUs/30s) e `load` (10 VUs/2m).
- Thresholds (SLA):
  - `http_req_failed < 1%`
  - `http_req_duration p(95) < 800ms`
  - `checks > 99%`

## Estrutura
```
teste3-qa/
├─ src/basic_load_test.js
├─ tools/analyze.js
├─ .github/workflows/ci.yml
├─ reports/                  # gerado
├─ package.json
└─ README.md
```

## Rodando local
```bash
npm install
npm run test:smoke   # cria reports/ e gera reports/summary.*
npm run analyze      # gera reports/analysis.md a partir de reports/summary.json

# (opcional) teste de carga
npm run test:load
npm run analyze
```

### Variáveis úteis
- `BASE_URL`, `MAX_ID`, `SLEEP_MS`
- `SMOKE_VUS`, `SMOKE_DURATION`
- `LOAD_VUS`, `LOAD_DURATION`, `LOAD_START`

Exemplo:
```bash
BASE_URL=https://httpbin.org npm run test:smoke
```

## Relatórios
- `reports/summary.json` / `.html` / `.txt` (último run)
- `reports/summary_YYYY-MM-DDTHHMMSS.*` (histórico)
- `reports/analysis.md` (interpretação dos resultados)

## CI (GitHub Actions)
Workflow padrão executa:
1. Cria `reports/`
2. Instala k6
3. `npm run test:smoke` e `npm run test:load`
4. `npm run analyze`
5. Publica `reports/` como artifact

## Licença
MIT
