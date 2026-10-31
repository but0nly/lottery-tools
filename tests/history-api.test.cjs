/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
const { GET } = require('../src/app/api/history/route.ts');
const request = (query) => new Request(`http://localhost/api/history?${query}`);

test('rejects unsupported lottery and sample sizes before contacting provider', async () => {
  global.fetch = () => { throw new Error('unexpected upstream request'); };
  for (const query of ['type=OTHER&limit=30', 'type=SSQ&limit=0', 'type=DLT&limit=501', 'type=SSQ&limit=3.5']) {
    assert.equal((await GET(request(query))).status, 400);
  }
});

test('returns only valid unique issues with sample and source metadata', async () => {
  const valid = { code: '2026001', day: '2026-01-01', one: '01', two: '02', three: '03', four: '04', five: '05', six: '06', seven: '07' };
  global.fetch = async () => new Response(JSON.stringify({ code: 1, data: { data: { list: [valid, valid, { ...valid, code: '2026002', two: '01' }, { ...valid, code: 'bad' }] } } }), { status: 200 });
  const response = await GET(request('type=SSQ&limit=4'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.history.length, 1);
  assert.equal(data.history[0].issue, '2026001');
  assert.equal(data.sampleSize, 1);
  assert.equal(data.requestedSize, 4);
  assert.ok(data.source);
  assert.ok(data.updatedAt);
});

test('reports upstream HTTP failure, timeout and unusable data', async () => {
  global.fetch = async () => new Response('failure', { status: 503 });
  assert.match((await (await GET(request('type=DLT&limit=1'))).json()).error, /不可用/);
  global.fetch = async () => { throw new DOMException('timed out', 'TimeoutError'); };
  assert.match((await (await GET(request('type=DLT&limit=1'))).json()).error, /超时/);
  global.fetch = async () => new Response(JSON.stringify({ code: 1, data: { data: { list: [] } } }));
  assert.match((await (await GET(request('type=DLT&limit=1'))).json()).error, /没有有效/);
});

test('validates both DLT zones and accepts a later valid copy of an invalid issue', async () => {
  const valid = { code: '2026002', day: '2026-01-02', one: '01', two: '02', three: '03', four: '04', five: '35', six: '01', seven: '12' };
  global.fetch = async (_url, options) => {
    assert.ok(options.signal);
    return new Response(JSON.stringify({ code: 1, data: { data: { list: [{ ...valid, seven: '13' }, valid, { ...valid, code: '2026003', six: '12' }] } } }));
  };
  const data = await (await GET(request('type=DLT&limit=3'))).json();
  assert.equal(data.sampleSize, 1);
  assert.equal(data.history[0].reds, '1,2,3,4,35');
  assert.equal(data.history[0].blues, '1,12');
});
