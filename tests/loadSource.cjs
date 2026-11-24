/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

// Ejecuta los módulos JS del frontend con Node, sin instalar otro runner.
function createLoader(overrides = {}) {
  const cache = new Map();
  function load(relativePath) {
    let filename = path.resolve(__dirname, '..', relativePath);
    if (!path.extname(filename)) {
      filename =
        [filename + '.js', filename + '.jsx', path.join(filename, 'index.js')].find((candidate) =>
          fs.existsSync(candidate),
        ) || filename;
    }
    if (overrides[filename]) return overrides[filename];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename,
      configFile: false,
      babelrc: false,
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      ],
    });
    const localRequire = (id) =>
      overrides[id] ||
      (id.startsWith('.') ? load(path.resolve(path.dirname(filename), id)) : require(id));
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
      localRequire,
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}
module.exports = { createLoader };
