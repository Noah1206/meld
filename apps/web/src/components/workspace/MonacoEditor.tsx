"use client";

import { useRef, useCallback, useEffect } from "react";
import Editor, { OnMount, BeforeMount, Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  filePath: string;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  isDark: boolean;
  readOnly?: boolean;
}

// File extension to Monaco language mapping
const getLanguage = (filePath: string): string => {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    htm: "html",
    md: "markdown",
    mdx: "markdown",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    svg: "xml",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    rb: "ruby",
    php: "php",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    sql: "sql",
    graphql: "graphql",
    gql: "graphql",
    dockerfile: "dockerfile",
    makefile: "makefile",
    toml: "ini",
    env: "ini",
    gitignore: "plaintext",
    prisma: "prisma",
  };
  return map[ext] || "plaintext";
};

// VSCode Dark+ theme colors (Meld dark theme)
const MELD_DARK_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6A9955" },
    { token: "keyword", foreground: "C586C0" },
    { token: "keyword.control", foreground: "C586C0" },
    { token: "storage", foreground: "569CD6" },
    { token: "storage.type", foreground: "569CD6" },
    { token: "string", foreground: "CE9178" },
    { token: "string.template", foreground: "CE9178" },
    { token: "number", foreground: "B5CEA8" },
    { token: "regexp", foreground: "D16969" },
    { token: "type", foreground: "4EC9B0" },
    { token: "type.identifier", foreground: "4EC9B0" },
    { token: "class", foreground: "4EC9B0" },
    { token: "interface", foreground: "4EC9B0" },
    { token: "function", foreground: "DCDCAA" },
    { token: "function.declaration", foreground: "DCDCAA" },
    { token: "variable", foreground: "9CDCFE" },
    { token: "variable.parameter", foreground: "9CDCFE" },
    { token: "constant", foreground: "4FC1FF" },
    { token: "tag", foreground: "569CD6" },
    { token: "attribute.name", foreground: "9CDCFE" },
    { token: "attribute.value", foreground: "CE9178" },
    { token: "delimiter.bracket", foreground: "FFD700" },
    { token: "delimiter", foreground: "808080" },
    { token: "operator", foreground: "D4D4D4" },
    { token: "punctuation", foreground: "808080" },
    // JSX/TSX specific
    { token: "tag.jsx", foreground: "4EC9B0" },
    { token: "tag.tsx", foreground: "4EC9B0" },
    // CSS specific
    { token: "attribute.name.css", foreground: "9CDCFE" },
    { token: "attribute.value.css", foreground: "CE9178" },
    { token: "selector.css", foreground: "D7BA7D" },
    { token: "property.css", foreground: "9CDCFE" },
    { token: "unit.css", foreground: "B5CEA8" },
    // JSON specific
    { token: "string.key.json", foreground: "9CDCFE" },
    { token: "string.value.json", foreground: "CE9178" },
  ],
  colors: {
    "editor.background": "#181818",
    "editor.foreground": "#D4D4D4",
    "editor.lineHighlightBackground": "#2A2A2A",
    "editor.selectionBackground": "#264F78",
    "editor.inactiveSelectionBackground": "#3A3D41",
    "editorLineNumber.foreground": "#858585",
    "editorLineNumber.activeForeground": "#C6C6C6",
    "editorCursor.foreground": "#AEAFAD",
    "editorWhitespace.foreground": "#3B3B3B",
    "editorIndentGuide.background": "#404040",
    "editorIndentGuide.activeBackground": "#707070",
    "editor.selectionHighlightBackground": "#ADD6FF26",
    "editor.wordHighlightBackground": "#575757",
    "editor.wordHighlightStrongBackground": "#004972",
    "editorBracketMatch.background": "#0D3A58",
    "editorBracketMatch.border": "#888888",
    "scrollbarSlider.background": "#79797966",
    "scrollbarSlider.hoverBackground": "#646464B3",
    "scrollbarSlider.activeBackground": "#BFBFBF66",
  },
};

// Light theme for Meld
const MELD_LIGHT_THEME: editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "008000" },
    { token: "keyword", foreground: "AF00DB" },
    { token: "keyword.control", foreground: "AF00DB" },
    { token: "storage", foreground: "0000FF" },
    { token: "storage.type", foreground: "0000FF" },
    { token: "string", foreground: "A31515" },
    { token: "number", foreground: "098658" },
    { token: "regexp", foreground: "811F3F" },
    { token: "type", foreground: "267F99" },
    { token: "type.identifier", foreground: "267F99" },
    { token: "class", foreground: "267F99" },
    { token: "interface", foreground: "267F99" },
    { token: "function", foreground: "795E26" },
    { token: "variable", foreground: "001080" },
    { token: "constant", foreground: "0070C1" },
    { token: "tag", foreground: "800000" },
    { token: "attribute.name", foreground: "FF0000" },
    { token: "attribute.value", foreground: "0000FF" },
    { token: "selector.css", foreground: "800000" },
    { token: "property.css", foreground: "FF0000" },
    { token: "string.key.json", foreground: "0451A5" },
    { token: "string.value.json", foreground: "A31515" },
  ],
  colors: {
    "editor.background": "#FFFFFF",
    "editor.foreground": "#000000",
    "editor.lineHighlightBackground": "#F8F8F8",
    "editor.selectionBackground": "#ADD6FF",
    "editorLineNumber.foreground": "#B4B4B0",
    "editorLineNumber.activeForeground": "#787774",
    "editorCursor.foreground": "#000000",
    "editorIndentGuide.background": "#D3D3D3",
    "editorIndentGuide.activeBackground": "#939393",
    "scrollbarSlider.background": "#64646466",
    "scrollbarSlider.hoverBackground": "#646464B3",
  },
};

export function MonacoEditor({
  filePath,
  value,
  onChange,
  onSave,
  isDark,
  readOnly = false,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleBeforeMount: BeforeMount = useCallback((monaco: Monaco) => {
    // Define custom themes
    monaco.editor.defineTheme("meld-dark", MELD_DARK_THEME);
    monaco.editor.defineTheme("meld-light", MELD_LIGHT_THEME);

    // Configure TypeScript/JavaScript defaults
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
    });

    // Disable diagnostics for faster performance
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    monacoRef.current = monaco;
  }, []);

  const handleEditorMount: OnMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Add save keybinding (Cmd+S / Ctrl+S)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });

      // Focus the editor
      editor.focus();
    },
    [onSave]
  );

  // Update theme when isDark changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(isDark ? "meld-dark" : "meld-light");
    }
  }, [isDark]);

  // Update editor value when filePath changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Update language if needed
        const newLang = getLanguage(filePath);
        const currentLang = model.getLanguageId();
        if (newLang !== currentLang) {
          monacoRef.current.editor.setModelLanguage(model, newLang);
        }
      }
    }
  }, [filePath]);

  return (
    <Editor
      height="100%"
      language={getLanguage(filePath)}
      value={value}
      onChange={(val) => onChange(val ?? "")}
      theme={isDark ? "meld-dark" : "meld-light"}
      beforeMount={handleBeforeMount}
      onMount={handleEditorMount}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily:
          "'SF Mono', Menlo, Monaco, 'Courier New', monospace",
        fontLigatures: true,
        lineHeight: 20,
        letterSpacing: 0,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: "off",
        lineNumbers: "on",
        glyphMargin: false,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: "mouseover",
        matchBrackets: "always",
        bracketPairColorization: { enabled: true },
        guides: {
          indentation: true,
          bracketPairs: true,
          highlightActiveIndentation: true,
        },
        renderWhitespace: "selection",
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        padding: { top: 16, bottom: 16 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false,
        },
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        snippetSuggestions: "inline",
        wordBasedSuggestions: "currentDocument",
        contextmenu: true,
        mouseWheelZoom: true,
        formatOnPaste: true,
        formatOnType: true,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoSurround: "languageDefined",
        links: true,
        colorDecorators: true,
      }}
      loading={
        <div className="flex h-full items-center justify-center">
          <div
            className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${
              isDark ? "border-[#555]" : "border-[#B4B4B0]"
            }`}
          />
        </div>
      }
    />
  );
}

export default MonacoEditor;
