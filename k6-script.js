import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Trend, Counter } from 'k6/metrics'

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 2, duration: '30s', tags: { stage: 'smoke' } },
    load:  { executor: 'ramping-vus', startVUs: 0, stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 }
    ], tags: { stage: 'load' } }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'],
    'checks{endpoint:getCharacter}': ['rate>0.99'],
  }
}

const tCharacter = new Trend('latency_character_ms')
const countOk = new Counter('count_ok')

const BASE = 'https://rickandmortyapi.com/api'

export default function () {
  group('GET character by id', () => {
    const res = http.get(`${BASE}/character/1`)
    tCharacter.add(res.timings.duration)
    const ok = check(res, {
      'status 200': r => r.status === 200,
      'tem nome':   r => JSON.parse(r.body).name === 'Rick Sanchez',
    }, { endpoint: 'getCharacter' })
    if (ok) countOk.add(1)
  })

  group('GET multiple characters', () => {
    const res = http.get(`${BASE}/character/1,2,3`)
    check(res, { 'status 200': r => r.status === 200 })
  })

  group('Search characters', () => {
    const res = http.get(`${BASE}/character/?name=rick`)
    check(res, { 'status 200': r => r.status === 200 })
  })

  sleep(1)
}
