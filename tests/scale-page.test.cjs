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
const Reducer = require('../src/app/reducer/page.tsx').default;
const { LotteryProvider } = require('../src/app/LotteryContext.tsx');

test('页面在生成前说明全复式规模及费用范围', () => {
  const html = renderToStaticMarkup(React.createElement(LotteryProvider, null, React.createElement(Reducer)));
  assert.match(html, /全复式：/);
  assert.match(html, /缩水或过滤后的注数及费用尚未计算/);
  assert.match(html, /不含大乐透追加、倍数/);
});
