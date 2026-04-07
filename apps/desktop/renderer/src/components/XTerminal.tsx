import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface XTerminalProps {
  className?: string;
}

export function XTerminal({ className }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      lineHeight: 1.4,
      theme: {
        background: "#1A1A1A",
        foreground: "#E0E0E0",
        cursor: "#E0E0E0",
        cursorAccent: "#1A1A1A",
        selectionBackground: "#404040",
        black: "#1A1A1A",
        red: "#FF6B6B",
        green: "#69DB7C",
        yellow: "#FFD43B",
        blue: "#74C0FC",
        magenta: "#DA77F2",
        cyan: "#66D9E8",
        white: "#E0E0E0",
        brightBlack: "#555555",
        brightRed: "#FF8787",
        brightGreen: "#8CE99A",
        brightYellow: "#FFE066",
        brightBlue: "#91D5FF",
        brightMagenta: "#E599F7",
        brightCyan: "#99E9F2",
        brightWhite: "#FFFFFF",
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    // Initial fit
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    termRef.current = term;
    fitRef.current = fitAddon;

    // Forward terminal input to PTY
    term.onData((data) => {
      window.electronAgent?.ptyInput(data);
    });

    // PTY resize
    term.onResize(({ cols, rows }) => {
      window.electronAgent?.ptyResize(cols, rows);
    });

    // Receive dev server output
    const agent = window.electronAgent;
    let cleanupTerminal: (() => void) | undefined;
    if (agent?.onTerminalOutput) {
      cleanupTerminal = agent.onTerminalOutput((data) => {
        term.write(data);
      });
    }

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {
          // Ignore resize errors
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cleanupTerminal?.();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ padding: "8px 4px", background: "#1A1A1A" }}
    />
  );
}
