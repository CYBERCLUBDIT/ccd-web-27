import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/theme.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });

for (const [name, value, throws, expected] of [
  ["defaults to dark without a saved preference", null, false, true],
  ["restores an explicit light preference before paint", "light", false, false],
  ["restores an explicit dark preference", "dark", false, true],
  ["uses dark for an unrecognised preference", "invalid", false, true],
  ["remains usable when browser storage is blocked", null, true, true],
]) {
  test(name, () => {
    let applied;
    const style = {};
    const document = { documentElement: { classList: { toggle: (className, active) => { assert.equal(className, "dark"); applied = active; } }, style } };
    const localStorage = { getItem: (key) => { assert.equal(key, exports.themeStorageKey); if (throws) throw new Error("Storage disabled"); return value; } };
    vm.runInNewContext(exports.themeInitScript, { document, localStorage });
    assert.equal(applied, expected);
    assert.equal(style.colorScheme, expected ? "dark" : "light");
  });
}
