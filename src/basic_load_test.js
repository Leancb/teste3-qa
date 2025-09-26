import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ===== Config via ENV =====
const BASE_URL = __ENV.BASE_URL || "https://jsonplaceholder.typicode.com";
const MAX_ID = Number(__ENV.MAX_ID || 100);
const SLEEP_MS = Number(__ENV.SLEEP_MS || 200);

// ===== Métricas custom =====
export const ok_rate = new Rate("ok_rate");
export const errors = new Counter("errors");
export const list_posts_duration = new Trend("list_posts_duration", true);
export const get_post_duration = new Trend("get_post_duration", true);

// ===== Opções (2 cenários) =====
export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      exec: "smokeScenario",
      vus: Number(__ENV.SMOKE_VUS || 2),
      duration: __ENV.SMOKE_DURATION || "30s",
      gracefulStop: "5s",
      tags: { scenario: "smoke" },
    },
    load: {
      executor: "constant-vus",
      exec: "loadScenario",
      vus: Number(__ENV.LOAD_VUS || 10),
      duration: __ENV.LOAD_DURATION || "2m",
      gracefulStop: "30s",
      tags: { scenario: "load" },
      startTime: __ENV.LOAD_START || "0s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
    checks: ["rate>0.99"],
  },
};

function getRandomId() {
  return Math.floor(Math.random() * MAX_ID) + 1;
}

export function smokeScenario() { mainFlow(); }
export function loadScenario() { mainFlow(); }

function mainFlow() {
  group("list posts", () => {
    const res = http.get(`${BASE_URL}/posts`, { tags: { endpoint: "/posts", method: "GET" } });
    list_posts_duration.add(res.timings.duration);
    const ok1 = check(res, {
      "GET /posts status 200": (r) => r.status === 200,
      "GET /posts é array não-vazio": (r) => {
        try { const data = r.json(); return Array.isArray(data) && data.length > 0; }
        catch (_) { return false; }
      },
    });
    ok_rate.add(ok1); if (!ok1) errors.add(1);
  });

  group("get single post", () => {
    const id = getRandomId();
    const res = http.get(`${BASE_URL}/posts/${id}`, { tags: { endpoint: "/posts/{id}", method: "GET" } });
    get_post_duration.add(res.timings.duration);
    const ok2 = check(res, {
      "GET /posts/{id} status 200": (r) => r.status === 200,
      "GET /posts/{id} tem id": (r) => {
        try { const data = r.json(); return data && typeof data.id !== "undefined"; }
        catch (_) { return false; }
      },
    });
    ok_rate.add(ok2); if (!ok2) errors.add(1);
  });

  sleep(SLEEP_MS / 1000);
}

// ===== Relatórios (summary) =====
// Importante: o k6 NÃO cria diretórios. Por isso, garantimos a pasta 'reports/'
// via scripts npm (pretest / preanalyze) e via CI antes de rodar.
export function handleSummary(data) {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>K6 Summary</title></head>
<body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;

  const txt = [
    `K6 SUMMARY - ${stamp}`,
    `Iterations: ${data.metrics.iterations ? data.metrics.iterations.values.count : "-"}`,
    `Checks rate: ${data.metrics.checks ? data.metrics.checks.values.rate : "-"}`,
    `http_req_failed: ${data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : "-"}`,
    `http_req_duration p95: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values["p(95)"] : "-"}`,
    ""
  ].join("\n");

  return {
    // "latest" (sobrescreve) dentro de reports/
    "reports/summary.json": JSON.stringify(data, null, 2),
    "reports/summary.html": html,
    "reports/summary.txt": txt,
    // histórico timestampado
    [`reports/summary_${stamp}.json`]: JSON.stringify(data, null, 2),
    [`reports/summary_${stamp}.html`]: html,
    [`reports/summary_${stamp}.txt`]: txt,
  };
}
