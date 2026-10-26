import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const builtins = new Set(
  builtinModules.map((name) => name.replace(/^node:/, "")),
);
const portable = (name) => name.split(path.sep).join("/");

/** Check actual resolved dependencies, including lazy imports, without executing app code. */
export function inspectArchitecture(root = process.cwd()) {
  const files = ts.sys.readDirectory(
    root,
    [".ts", ".tsx"],
    ["node_modules", "dist", "tests"],
    ["src/**/*", "server/**/*"],
  );
  const configPath = ts.findConfigFile(
    root,
    ts.sys.fileExists,
    "tsconfig.json",
  );
  const config = configPath
    ? ts.readConfigFile(configPath, ts.sys.readFile).config
    : {};
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const graph = new Map(files.map((file) => [file, new Set()]));
  const errors = new Set();
  for (const file of files) {
    const relative = portable(path.relative(root, file));
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function dependency(specifier, typeOnly) {
      if (
        relative.startsWith("src/") &&
        builtins.has(specifier.replace(/^node:/, ""))
      )
        errors.add(
          `${relative}: browser code cannot import Node module ${specifier}`,
        );
      if (!specifier.startsWith(".")) return;
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys)
        .resolvedModule?.resolvedFileName;
      if (
        !resolved &&
        /\.(css|svg|png|jpe?g|webp|woff2?)$/.test(specifier) &&
        fs.existsSync(path.resolve(path.dirname(file), specifier))
      )
        return;
      if (!resolved || !graph.has(resolved)) {
        errors.add(`${relative}: unresolved local dependency ${specifier}`);
        return;
      }
      const target = portable(path.relative(root, resolved));
      if (relative.startsWith("src/") && target.startsWith("server/"))
        errors.add(
          `${relative}: browser code cannot import server code ${target}`,
        );
      if (
        relative.startsWith("server/") &&
        target.startsWith("src/") &&
        !target.startsWith("src/lib/")
      )
        errors.add(
          `${relative}: server code can only use shared library modules, not ${target}`,
        );
      if (
        relative.startsWith("src/lib/") &&
        /^(src\/components\/|src\/pages\/)/.test(target)
      )
        errors.add(`${relative}: library code cannot depend on UI ${target}`);
      if (
        relative.startsWith("src/components/") &&
        relative !== "src/components/WorkspacePages.tsx" &&
        target.startsWith("src/pages/")
      )
        errors.add(
          `${relative}: reusable components cannot import pages ${target}`,
        );
      if (target === "src/lib/domain.ts")
        errors.add(
          `${relative}: import the owning module instead of the compatibility domain barrel`,
        );
      if (!typeOnly) graph.get(file).add(resolved);
    }
    function visit(node) {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        const onlyTypes =
          clause?.isTypeOnly ||
          (!clause?.name &&
            bindings &&
            ts.isNamedImports(bindings) &&
            bindings.elements.length > 0 &&
            bindings.elements.every((entry) => entry.isTypeOnly));
        dependency(node.moduleSpecifier.text, Boolean(onlyTypes));
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        dependency(node.moduleSpecifier.text, node.isTypeOnly);
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument))
          dependency(argument.text, false);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const visited = new Set();
  const active = new Set();
  function checkCycles(file, trail) {
    if (active.has(file)) {
      errors.add(
        `Runtime dependency cycle: ${[...trail.slice(trail.indexOf(file)), file].map((entry) => portable(path.relative(root, entry))).join(" -> ")}`,
      );
      return;
    }
    if (visited.has(file)) return;
    active.add(file);
    for (const dependency of graph.get(file) ?? [])
      checkCycles(dependency, [...trail, file]);
    active.delete(file);
    visited.add(file);
  }
  for (const file of files) checkCycles(file, []);
  return { modules: files.length, errors: [...errors].sort() };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = inspectArchitecture();
  if (report.errors.length) {
    for (const error of report.errors) console.error(error);
    process.exitCode = 1;
  } else
    console.log(
      `Architecture checks passed: ${report.modules} production modules, no runtime cycles or forbidden dependency boundaries.`,
    );
}
