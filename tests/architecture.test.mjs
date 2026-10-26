import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectArchitecture } from "../scripts/check-architecture.mjs";

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gatherly-architecture-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
}

test("architecture gate rejects server secrets, Node imports, UI inversion and compatibility-barrel imports", (t) => {
  const root = fixture(t, {
    "src/lib/domain.ts": "export const domain=1;",
    "src/lib/bad.ts":
      "import '../../server/secret.ts'; import 'node:fs'; import '../pages/Page.tsx'; import './domain.ts';",
    "server/secret.ts": "export const secret=1;",
    "server/bad.ts": "import '../src/pages/Page.tsx';",
    "src/pages/Page.tsx": "export const Page=1;",
    "src/components/Bad.tsx": "import '../pages/Page.tsx';",
  });
  const { errors } = inspectArchitecture(root);
  for (const text of [
    "browser code cannot import server",
    "browser code cannot import Node",
    "library code cannot depend on UI",
    "server code can only use shared",
    "reusable components cannot import pages",
    "compatibility domain barrel",
  ])
    assert(
      errors.some((error) => error.includes(text)),
      text,
    );
});

test("architecture gate follows lazy imports and rejects cycles and missing modules", (t) => {
  const root = fixture(t, {
    "src/a.ts":
      "export const load=()=>import('./b.ts'); import './missing.ts';",
    "src/b.ts": "export {load} from './a.ts';",
  });
  const { errors } = inspectArchitecture(root);
  assert(errors.some((error) => error.includes("Runtime dependency cycle")));
  assert(errors.some((error) => error.includes("unresolved local dependency")));
});

test("architecture gate accepts type-only cycles and existing stylesheet imports", (t) => {
  const root = fixture(t, {
    "src/a.ts":
      "import type {B} from './b.ts'; import './style.css'; export type A=B;",
    "src/b.ts": "import {type A} from './a.ts'; export type B=A;",
    "src/style.css": "body{}",
  });
  assert.deepEqual(inspectArchitecture(root).errors, []);
});
