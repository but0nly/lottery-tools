/* eslint-disable @typescript-eslint/no-require-imports -- The loader compiles Next page modules for server rendering. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Load the actual page components with the same TypeScript and JSX semantics as Next.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(process.cwd(), 'src', request.slice(2)) : request, ...args);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    module._compile(compiled.outputText, filename);
  };
}
const Home = require('../src/app/page.tsx').default;
const Reverse = require('../src/app/reverse/page.tsx').default;
const { LotteryProvider } = require('../src/app/LotteryContext.tsx');
const { evaluateCombinationCrowding, generateReverseBatch, DEFAULT_GAME_THEORY_CONFIG } = require('../src/lib/combinations.ts');

test('home explains anti-crowding assumptions without promising a better outcome', () => {
  const html = renderToStaticMarkup(React.createElement(Home));
  assert.match(html, /基于.*官方中奖数据估计/);
  assert.match(html, /不保证减少撞注或提高收益/);
  assert.match(html, /分奖影响与开奖概率是两回事/);
  assert.doesNotMatch(html, /提升独揽大奖概率/);
});

test('reverse analysis explains probability and prize sharing alongside combo-level parameters', () => {
  const html = renderToStaticMarkup(React.createElement(LotteryProvider, null, React.createElement(Reverse)));
  assert.match(html, /公平、独立开奖/);
  assert.match(html, /基于.*官方中奖数据估计/);
  assert.match(html, /不保证减少撞注或提高收益/);
  assert.match(html, /规律形态避让/);
  assert.match(html, /纯生日票避让/);
  assert.doesNotMatch(html, /历史低频/);
});

test('evaluateCombinationCrowding penalizes arithmetic/consecutive/birthday patterns and rewards large/high-AC combos', () => {
  const crowded = evaluateCombinationCrowding('SSQ', [1, 2, 3, 4, 5, 6], [6], DEFAULT_GAME_THEORY_CONFIG);
  const unpopular = evaluateCombinationCrowding('SSQ', [2, 13, 19, 27, 32, 33], [15], DEFAULT_GAME_THEORY_CONFIG);
  assert.equal(crowded.acValue, 0);
  assert.equal(crowded.largeCount, 0);
  assert.ok(unpopular.acValue >= 8);
  assert.equal(unpopular.largeCount, 2);
  assert.ok(unpopular.coldnessScore > crowded.coldnessScore);

  const batch = generateReverseBatch('SSQ', 10, DEFAULT_GAME_THEORY_CONFIG);
  assert.equal(batch.length, 10);
});
