import fs from "fs";
import path from "path";

const DEFAULT_SUMMARY = path.join("reports", "summary.json");
const OUTPUT_MD = path.join("reports", "analysis.md");

function loadJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Resumo não encontrado em: ${file}. Rode primeiro: k6 run src/basic_load_test.js`);
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function fmtPct(n) { return (Number(n) * 100).toFixed(2) + "%"; }
function fmtMs(n) { return `${Number(n).toFixed(0)} ms`; }

function main() {
  // garante reports/
  fs.mkdirSync("reports", { recursive: true });

  const input = process.env.SUMMARY || DEFAULT_SUMMARY;
  const data = loadJson(input);

  const m = data.metrics || {};
  const checksRate = m.checks?.values?.rate ?? null;
  const failedRate = m.http_req_failed?.values?.rate ?? null;
  const p95 = m.http_req_duration?.values?.["p(95)"] ?? null;
  const avg = m.http_req_duration?.values?.avg ?? null;
  const iters = m.iterations?.values?.count ?? null;
  const vusMax = m.vus_max?.values?.value ?? null;
  const rps = m.http_reqs?.values?.rate ?? null;
  const thresholds = data.thresholds || {};

  let lines = [];
  lines.push(`# Análise dos Resultados - K6`);
  lines.push("");
  lines.push(`**Arquivo analisado:** \`${input}\``);
  lines.push("");
  lines.push(`## Resumo Numérico`);
  lines.push("");
  lines.push(`- Iterations: **${iters ?? "-"}**`);
  lines.push(`- VUs (máx): **${vusMax ?? "-"}**`);
  lines.push(`- RPS médio: **${rps ? rps.toFixed(2) : "-"}**`);
  lines.push(`- Checks rate: **${checksRate !== null ? fmtPct(checksRate) : "-"}**`);
  lines.push(`- Falhas (http_req_failed): **${failedRate !== null ? fmtPct(failedRate) : "-"}**`);
  lines.push(`- Latência média: **${avg !== null ? fmtMs(avg) : "-"}**`);
  lines.push(`- Latência p95: **${p95 !== null ? fmtMs(p95) : "-"}**`);
  lines.push("");

  lines.push(`## Thresholds`);
  if (Object.keys(thresholds).length === 0) {
    lines.push("- (Sem thresholds declarados no summary.)");
  } else {
    for (const [metric, def] of Object.entries(thresholds)) {
      lines.push(`- **${metric}** → ${JSON.stringify(def)}`);
    }
  }
  lines.push("");

  lines.push(`## Alertas`);
  if (failedRate !== null && failedRate > 0) {
    lines.push(`- ⚠️ Falhas de requisição: ${fmtPct(failedRate)}`);
  } else {
    lines.push(`- ✅ Nenhuma falha de requisição registrada.`);
  }
  if (checksRate !== null && checksRate < 0.99) {
    lines.push(`- ⚠️ Checks abaixo de 99%: ${fmtPct(checksRate)}`);
  }
  if (p95 !== null && p95 > 800) {
    lines.push(`- ⚠️ p95 acima do SLA de 800ms: ${fmtMs(p95)}.`);
  } else if (p95 !== null) {
    lines.push(`- ✅ p95 dentro do SLA de 800ms: ${fmtMs(p95)}.`);
  }
  lines.push("");

  lines.push(`## Próximos Passos (sugestões)`);
  lines.push(`- Ajustar SLA/thresholds conforme o perfil de carga real.`);
  lines.push(`- Usar **ramping-arrival-rate** para avaliar escalabilidade.`);
  lines.push(`- Taguear métricas por endpoint e criar **thresholds por grupo**.`);
  lines.push(`- Publicar artifacts (summary.* + analysis.md) no CI.`);
  lines.push("");

  fs.writeFileSync(OUTPUT_MD, lines.join("\n"), "utf-8");
  console.log(`Análise gerada em: ${OUTPUT_MD}`);
}

try { main(); } catch (err) { console.error(err.message); process.exit(1); }
