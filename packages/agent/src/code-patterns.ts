import * as fs from "node:fs";
import * as path from "node:path";

// ─── Code Pattern Analyzer: Auto-detect project code style ──

interface PatternResult {
  importStyle: { named: number; default: number; aliasPath: number; relativePath: number };
  componentStyle: { arrowFn: number; fnDecl: number; exportDefault: number; exportNamed: number };
  stateManagement: { useState: number; useReducer: number; zustand: number; redux: number; jotai: number; recoil: number };
  styling: { tailwind: number; cssModules: number; styledComponents: number; inlineStyle: number; emotion: number };
  typescript: { interface: number; type: number; propsNaming: string[] };
  naming: { camelCaseFiles: number; pascalCaseFiles: number; kebabCaseFiles: number };
  commonImports: Map<string, number>;
}

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".turbo",
  ".cache", ".meld", "coverage", "__tests__", "__mocks__",
]);

const CODE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

function collectSourceFiles(projectPath: string, maxFiles: number): string[] {
  const candidates: string[] = [];
  const srcDirs = [
    "src/components", "src/app", "src/pages", "src/views",
    "src/features", "app", "components", "pages", "src",
  ];

  for (const dir of srcDirs) {
    const fullDir = path.join(projectPath, dir);
    if (!fs.existsSync(fullDir)) continue;
    walkDir(fullDir, candidates, maxFiles * 3);
    if (candidates.length >= maxFiles) break;
  }

  return candidates.slice(0, maxFiles);
}

function walkDir(dir: string, results: string[], limit: number): void {
  if (results.length >= limit) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= limit) return;
    if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, results, limit);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (
        CODE_EXTENSIONS.has(ext) &&
        !entry.name.includes(".test.") &&
        !entry.name.includes(".spec.") &&
        !entry.name.includes(".stories.")
      ) {
        results.push(fullPath);
      }
    }
  }
}

function analyzeFile(filePath: string, result: PatternResult): void {
  let content: string;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 100 * 1024) return;
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  const fileName = path.basename(filePath, path.extname(filePath));

  if (/^[A-Z][a-zA-Z0-9]*$/.test(fileName)) {
    result.naming.pascalCaseFiles++;
  } else if (/^[a-z][a-zA-Z0-9]*$/.test(fileName)) {
    result.naming.camelCaseFiles++;
  } else if (/^[a-z][a-z0-9-]*$/.test(fileName)) {
    result.naming.kebabCaseFiles++;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("import ")) {
      if (/import\s+\{/.test(trimmed)) result.importStyle.named++;
      if (/import\s+[A-Za-z_$]/.test(trimmed) && !/import\s+\{/.test(trimmed) && !/import\s+\*/.test(trimmed)) {
        result.importStyle.default++;
      }
      if (/from\s+["']@\//.test(trimmed) || /from\s+["']~\//.test(trimmed)) {
        result.importStyle.aliasPath++;
      }
      if (/from\s+["']\.\.?\//.test(trimmed)) {
        result.importStyle.relativePath++;
      }

      const fromMatch = trimmed.match(/from\s+["']([^"']+)["']/);
      if (fromMatch && !fromMatch[1].startsWith(".")) {
        const pkg = fromMatch[1].startsWith("@")
          ? fromMatch[1].split("/").slice(0, 2).join("/")
          : fromMatch[1].split("/")[0];
        result.commonImports.set(pkg, (result.commonImports.get(pkg) || 0) + 1);
      }
    }

    if (/^export\s+default\s+function\s/.test(trimmed) || /^export\s+default\s/.test(trimmed)) {
      result.componentStyle.exportDefault++;
    }
    if (/^export\s+(const|function)\s/.test(trimmed)) {
      result.componentStyle.exportNamed++;
    }
    if (/^(export\s+)?(const|let)\s+\w+\s*[:=]\s*(\([^)]*\)|[A-Za-z_$]\w*)\s*=>/.test(trimmed)) {
      result.componentStyle.arrowFn++;
    }
    if (/^(export\s+)?(async\s+)?function\s+[A-Z]/.test(trimmed)) {
      result.componentStyle.fnDecl++;
    }

    if (/useState\s*[<(]/.test(trimmed)) result.stateManagement.useState++;
    if (/useReducer\s*[<(]/.test(trimmed)) result.stateManagement.useReducer++;
    if (/from\s+["']zustand["']/.test(trimmed) || /\bcreate\s*\(/.test(trimmed) && /zustand/.test(content)) {
      result.stateManagement.zustand++;
    }
    if (/useSelector|useDispatch|createSlice/.test(trimmed)) result.stateManagement.redux++;
    if (/\buseAtom\b|\batom\(/.test(trimmed)) result.stateManagement.jotai++;
    if (/\buseRecoilState\b|\buseRecoilValue\b/.test(trimmed)) result.stateManagement.recoil++;

    if (/className\s*=\s*["'`]/.test(trimmed) && /\b(flex|grid|p-|m-|text-|bg-|w-|h-|rounded|border)\b/.test(trimmed)) {
      result.styling.tailwind++;
    }
    if (/\.module\.(css|scss|less)["']/.test(trimmed) || /styles\.\w+/.test(trimmed)) {
      result.styling.cssModules++;
    }
    if (/styled\.\w+|styled\(/.test(trimmed)) result.styling.styledComponents++;
    if (/style\s*=\s*\{\{/.test(trimmed)) result.styling.inlineStyle++;
    if (/css`|cx\(/.test(trimmed)) result.styling.emotion++;

    if (/^(export\s+)?interface\s+\w+/.test(trimmed)) {
      result.typescript.interface++;
      const nameMatch = trimmed.match(/interface\s+(\w+)/);
      if (nameMatch && nameMatch[1].endsWith("Props")) {
        result.typescript.propsNaming.push(nameMatch[1]);
      }
    }
    if (/^(export\s+)?type\s+\w+\s*=/.test(trimmed)) {
      result.typescript.type++;
      const nameMatch = trimmed.match(/type\s+(\w+)/);
      if (nameMatch && nameMatch[1].endsWith("Props")) {
        result.typescript.propsNaming.push(nameMatch[1]);
      }
    }
  }
}

function formatPatterns(result: PatternResult): string {
  const lines: string[] = [];

  const importParts: string[] = [];
  if (result.importStyle.named > result.importStyle.default) {
    importParts.push("named imports preferred");
  } else if (result.importStyle.default > result.importStyle.named) {
    importParts.push("default imports preferred");
  }
  if (result.importStyle.aliasPath > result.importStyle.relativePath) {
    importParts.push("@/ path aliases");
  } else if (result.importStyle.relativePath > 0) {
    importParts.push("relative paths");
  }
  if (importParts.length) lines.push(`- Imports: ${importParts.join(", ")}`);

  const compParts: string[] = [];
  if (result.componentStyle.arrowFn > result.componentStyle.fnDecl) {
    compParts.push("arrow functions");
  } else if (result.componentStyle.fnDecl > result.componentStyle.arrowFn) {
    compParts.push("function declarations");
  }
  if (result.componentStyle.exportNamed > result.componentStyle.exportDefault) {
    compParts.push("named exports");
  } else if (result.componentStyle.exportDefault > 0) {
    compParts.push("default exports");
  }
  if (compParts.length) lines.push(`- Components: ${compParts.join(", ")}`);

  const stateParts: string[] = [];
  const sm = result.stateManagement;
  if (sm.useState > 0) stateParts.push("useState");
  if (sm.zustand > 0) stateParts.push("zustand");
  if (sm.redux > 0) stateParts.push("redux");
  if (sm.useReducer > 0) stateParts.push("useReducer");
  if (sm.jotai > 0) stateParts.push("jotai");
  if (sm.recoil > 0) stateParts.push("recoil");
  if (stateParts.length) lines.push(`- State: ${stateParts.join(", ")}`);

  const styleParts: string[] = [];
  const st = result.styling;
  if (st.tailwind > 0) styleParts.push(`Tailwind(${st.tailwind})`);
  if (st.cssModules > 0) styleParts.push(`CSS Modules(${st.cssModules})`);
  if (st.styledComponents > 0) styleParts.push(`styled-components(${st.styledComponents})`);
  if (st.emotion > 0) styleParts.push(`Emotion(${st.emotion})`);
  if (st.inlineStyle > 0) styleParts.push(`inline(${st.inlineStyle})`);
  if (styleParts.length) lines.push(`- Styling: ${styleParts.join(", ")}`);

  const tsParts: string[] = [];
  if (result.typescript.interface > result.typescript.type) {
    tsParts.push("interface preferred");
  } else if (result.typescript.type > result.typescript.interface) {
    tsParts.push("type preferred");
  }
  if (result.typescript.propsNaming.length > 0) {
    const sample = result.typescript.propsNaming.slice(0, 3).join(", ");
    tsParts.push(`Props: ${sample}`);
  }
  if (tsParts.length) lines.push(`- TypeScript: ${tsParts.join(", ")}`);

  const namingParts: string[] = [];
  const n = result.naming;
  if (n.pascalCaseFiles > n.camelCaseFiles && n.pascalCaseFiles > n.kebabCaseFiles) {
    namingParts.push("PascalCase files");
  } else if (n.kebabCaseFiles > n.camelCaseFiles && n.kebabCaseFiles > n.pascalCaseFiles) {
    namingParts.push("kebab-case files");
  } else if (n.camelCaseFiles > 0) {
    namingParts.push("camelCase files");
  }
  if (namingParts.length) lines.push(`- Naming: ${namingParts.join(", ")}`);

  const topImports = Array.from(result.commonImports.entries())
    .filter(([pkg]) => !["react", "next"].includes(pkg))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pkg]) => pkg);
  if (topImports.length) lines.push(`- Common libs: ${topImports.join(", ")}`);

  if (lines.length === 0) return "";
  return lines.join("\n");
}

export async function analyzeCodePatterns(projectPath: string): Promise<string> {
  const files = collectSourceFiles(projectPath, 10);
  if (files.length === 0) return "";

  const result: PatternResult = {
    importStyle: { named: 0, default: 0, aliasPath: 0, relativePath: 0 },
    componentStyle: { arrowFn: 0, fnDecl: 0, exportDefault: 0, exportNamed: 0 },
    stateManagement: { useState: 0, useReducer: 0, zustand: 0, redux: 0, jotai: 0, recoil: 0 },
    styling: { tailwind: 0, cssModules: 0, styledComponents: 0, inlineStyle: 0, emotion: 0 },
    typescript: { interface: 0, type: 0, propsNaming: [] },
    naming: { camelCaseFiles: 0, pascalCaseFiles: 0, kebabCaseFiles: 0 },
    commonImports: new Map(),
  };

  for (const file of files) {
    analyzeFile(file, result);
  }

  const formatted = formatPatterns(result);
  if (!formatted) return "";

  return `## Detected Code Patterns\n(Based on ${files.length} sampled source files)\n${formatted}`;
}
