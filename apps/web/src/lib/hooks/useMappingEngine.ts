"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useAgentStore } from "@/lib/store/agent-store";
import { matchByNaming } from "@/lib/mapping/engine";
import type { FigmaViewerNode } from "@/lib/figma/types";

// Mapping result type
export interface MappingResult {
  filePath: string;
  confidence: number;
  method: "naming" | "ai" | "cache";
  figmaNodeId: string;
  figmaNodeName: string;
}

// Minimum confidence threshold for naming-based mapping
const NAMING_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Hook that auto-maps Figma node selection to code files.
 *
 * 3-step strategy:
 *  1. Cache check (previous successful mappings)
 *  2. matchByNaming (naming convention matching)
 *  3. AI inference (fallback when confidence < 0.5)
 *
 * Automatically updates agentStore.selectedFilePath with the result.
 */
export function useMappingEngine() {
  // In-memory cache: figmaNodeId -> MappingResult
  const cacheRef = useRef<Map<string, MappingResult>>(new Map());

  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const selectedNode = useFigmaStore((s) => s.selectedNode);
  const fileTree = useAgentStore((s) => s.fileTree);
  const setSelectedFilePath = useAgentStore((s) => s.setSelectedFilePath);

  // Flatten fileTree into a flat array of paths
  const flattenPaths = useCallback(
    (entries: { name: string; path: string; type: "file" | "directory"; children?: unknown[] }[]): string[] => {
      const paths: string[] = [];
      for (const entry of entries) {
        if (entry.type === "file") paths.push(entry.path);
        if (entry.children) paths.push(...flattenPaths(entry.children as typeof entries));
      }
      return paths;
    },
    []
  );

  // AI inference fallback
  const inferWithAI = useCallback(
    async (node: FigmaViewerNode, filePaths: string[]): Promise<MappingResult | null> => {
      try {
        const res = await fetch("/api/ai/map-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            figmaNodeName: node.name,
            figmaNodeType: node.type,
            filePaths,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "AI mapping request failed" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data: { filePath: string; confidence: number } = await res.json();
        if (!data.filePath || data.confidence < 0.3) return null;

        return {
          filePath: data.filePath,
          confidence: data.confidence,
          method: "ai",
          figmaNodeId: node.id,
          figmaNodeName: node.name,
        };
      } catch (err) {
        console.warn("[MappingEngine] AI inference failed:", err);
        return null;
      }
    },
    []
  );

  // Main mapping logic: runs when selectedNode changes
  useEffect(() => {
    if (!selectedNode) {
      setMappingResult(null);
      setMappingError(null);
      return;
    }

    const filePaths = flattenPaths(fileTree as never[]);
    if (filePaths.length === 0) {
      setMappingResult(null);
      setMappingError(null);
      return;
    }

    let cancelled = false;

    const runMapping = async () => {
      setIsMapping(true);
      setMappingError(null);

      try {
        // Step 1: Check cache
        const cached = cacheRef.current.get(selectedNode.id);
        if (cached) {
          if (!cancelled) {
            setMappingResult(cached);
            setSelectedFilePath(cached.filePath);
            setIsMapping(false);
          }
          return;
        }

        // Step 2: Naming convention matching
        const namingMatch = matchByNaming(selectedNode.name, filePaths);

        if (namingMatch && namingMatch.confidence >= NAMING_CONFIDENCE_THRESHOLD) {
          const result: MappingResult = {
            filePath: namingMatch.filePath,
            confidence: namingMatch.confidence,
            method: "naming",
            figmaNodeId: selectedNode.id,
            figmaNodeName: selectedNode.name,
          };
          cacheRef.current.set(selectedNode.id, result);

          if (!cancelled) {
            setMappingResult(result);
            setSelectedFilePath(result.filePath);
            setIsMapping(false);
          }
          return;
        }

        // Step 3: AI inference (naming match failed or confidence < 0.5)
        const aiResult = await inferWithAI(selectedNode, filePaths);
        if (cancelled) return;

        if (aiResult) {
          cacheRef.current.set(selectedNode.id, aiResult);
          setMappingResult(aiResult);
          setSelectedFilePath(aiResult.filePath);
        } else {
          // If naming match exists but with low confidence, still show it
          if (namingMatch) {
            const lowResult: MappingResult = {
              filePath: namingMatch.filePath,
              confidence: namingMatch.confidence,
              method: "naming",
              figmaNodeId: selectedNode.id,
              figmaNodeName: selectedNode.name,
            };
            setMappingResult(lowResult);
            // Low confidence, so don't auto-select
          } else {
            setMappingResult(null);
            setMappingError(`No matching code file found for "${selectedNode.name}"`);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setMappingError(err instanceof Error ? err.message : "Mapping failed");
        }
      } finally {
        if (!cancelled) setIsMapping(false);
      }
    };

    runMapping();

    return () => {
      cancelled = true;
    };
  }, [selectedNode, fileTree, flattenPaths, inferWithAI, setSelectedFilePath]);

  // Manually apply a mapping result (when user clicks a suggestion)
  const applyMapping = useCallback(
    (result: MappingResult) => {
      cacheRef.current.set(result.figmaNodeId, result);
      setMappingResult(result);
      setSelectedFilePath(result.filePath);
    },
    [setSelectedFilePath]
  );

  // Manually set a mapping (when user directly selects a file)
  const setManualMapping = useCallback(
    (figmaNodeId: string, figmaNodeName: string, filePath: string) => {
      const result: MappingResult = {
        filePath,
        confidence: 1.0,
        method: "cache", // Manual mappings are stored as cache
        figmaNodeId,
        figmaNodeName,
      };
      cacheRef.current.set(figmaNodeId, result);
      setMappingResult(result);
      setSelectedFilePath(filePath);
    },
    [setSelectedFilePath]
  );

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    mappingResult,
    isMapping,
    mappingError,
    applyMapping,
    setManualMapping,
    clearCache,
    cacheSize: cacheRef.current.size,
  };
}
