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

test('home explains the two modes without promising a better outcome', () => {
  const html = renderToStaticMarkup(React.createElement(Home));
  assert.match(html, /历史低频不代表未来更容易开出/);
  assert.match(html, /未经真实投注数据验证/);
  assert.doesNotMatch(html, /提升独揽大奖概率/);
});

test('reverse analysis explains probability and prize sharing alongside results', () => {
  const html = renderToStaticMarkup(React.createElement(LotteryProvider, null, React.createElement(Reverse)));
  assert.match(html, /公平、独立开奖/);
  assert.match(html, /未经真实投注数据验证/);
  assert.match(html, /不保证减少撞注或提高收益/);
  assert.match(html, /分奖[^<]*开奖概率/);
});
