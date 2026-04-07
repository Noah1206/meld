#!/usr/bin/env npx tsx
/**
 * 파인튜닝 데이터 내보내기 스크립트
 *
 * Supabase training_data 테이블에서 데이터를 가져와
 * Qwen3-Coder 파인튜닝에 사용할 수 있는 JSONL 포맷으로 변환합니다.
 *
 * 사용법:
 *   npx tsx scripts/export-training-data.ts
 *   npx tsx scripts/export-training-data.ts --min-rating 3
 *   npx tsx scripts/export-training-data.ts --tag tailwind --format alpaca
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

// --- 환경변수 ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qafiyhrwegmdcpjbmslm.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  console.error("export SUPABASE_SERVICE_ROLE_KEY=your_key 후 다시 실행하세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CLI 인자 파싱 ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const minRating = parseInt(getArg("min-rating") ?? "0", 10);
const filterTag = getArg("tag");
const format = getArg("format") ?? "chatml"; // "chatml" | "alpaca" | "raw"
const limit = parseInt(getArg("limit") ?? "10000", 10);

// --- 데이터 포맷 변환 ---

interface TrainingRow {
  id: string;
  instruction: string;
  input_context: string;
  output: string;
  model_used: string;
  rating: number | null;
  element_history: string | null;
  design_system_md: string | null;
  framework: string | null;
  file_path: string | null;
  tags: string[] | null;
  created_at: string;
}

// ChatML 포맷 (Qwen 파인튜닝 표준)
function toChatML(row: TrainingRow) {
  let systemContent = "You are Meld AI, an expert code editor that modifies existing code.";

  if (row.framework) {
    systemContent += ` This project uses ${row.framework}.`;
  }
  if (row.design_system_md) {
    systemContent += `\n\nDESIGN SYSTEM:\n${row.design_system_md}`;
  }
  if (row.element_history) {
    try {
      const elements = JSON.parse(row.element_history);
      if (elements.length > 0) {
        systemContent += `\n\nSELECTED ELEMENTS:\n${elements.map((e: { tagName: string; className: string }, i: number) =>
          `[${i + 1}] <${e.tagName}> class="${e.className}"`
        ).join("\n")}`;
      }
    } catch { /* ignore */ }
  }

  return {
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: row.input_context ? `${row.input_context}\n\nInstruction: ${row.instruction}` : row.instruction },
      { role: "assistant", content: row.output },
    ],
  };
}

// Alpaca 포맷 (범용)
function toAlpaca(row: TrainingRow) {
  return {
    instruction: row.instruction,
    input: row.input_context || "",
    output: row.output,
    metadata: {
      framework: row.framework,
      file_path: row.file_path,
      tags: row.tags,
      model_used: row.model_used,
      rating: row.rating,
    },
  };
}

// Raw 포맷 (원본 그대로)
function toRaw(row: TrainingRow) {
  return row;
}

// --- 실행 ---

async function main() {
  console.log("📦 Meld AI 트레이닝 데이터 내보내기");
  console.log(`   포맷: ${format}`);
  console.log(`   최소 평점: ${minRating || "없음"}`);
  console.log(`   태그 필터: ${filterTag || "없음"}`);
  console.log(`   최대 건수: ${limit}`);
  console.log();

  // Supabase 쿼리
  let query = supabase
    .from("training_data")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (minRating > 0) {
    query = query.gte("rating", minRating);
  }
  if (filterTag) {
    query = query.contains("tags", [filterTag]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ 데이터 조회 실패:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("⚠️  조건에 맞는 데이터가 없습니다.");
    process.exit(0);
  }

  console.log(`✅ ${data.length}건 데이터 조회 완료`);

  // 포맷 변환
  const formatter = format === "alpaca" ? toAlpaca : format === "raw" ? toRaw : toChatML;
  const lines = data.map((row: TrainingRow) => JSON.stringify(formatter(row)));

  // 출력 파일
  const outDir = path.join(process.cwd(), "training-data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `meld-training-${format}-${timestamp}.jsonl`;
  const outPath = path.join(outDir, filename);

  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");

  console.log(`\n📁 저장 완료: ${outPath}`);
  console.log(`   총 ${lines.length}건, ${(Buffer.byteLength(lines.join("\n")) / 1024).toFixed(1)} KB`);

  // 통계
  const tagCounts: Record<string, number> = {};
  const frameworkCounts: Record<string, number> = {};
  const modelCounts: Record<string, number> = {};
  let ratedCount = 0;
  let avgRating = 0;

  for (const row of data as TrainingRow[]) {
    if (row.tags) for (const t of row.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    if (row.framework) frameworkCounts[row.framework] = (frameworkCounts[row.framework] ?? 0) + 1;
    modelCounts[row.model_used] = (modelCounts[row.model_used] ?? 0) + 1;
    if (row.rating) { ratedCount++; avgRating += row.rating; }
  }

  console.log("\n📊 통계:");
  console.log(`   모델별: ${Object.entries(modelCounts).map(([k, v]) => `${k}(${v})`).join(", ")}`);
  console.log(`   프레임워크: ${Object.entries(frameworkCounts).map(([k, v]) => `${k}(${v})`).join(", ") || "없음"}`);
  console.log(`   태그 상위: ${Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`).join(", ")}`);
  if (ratedCount > 0) console.log(`   평점: 평균 ${(avgRating / ratedCount).toFixed(1)} (${ratedCount}건 평가됨)`);

  console.log("\n🎯 파인튜닝 준비:");
  console.log("   1. unsloth 설치: pip install unsloth");
  console.log("   2. 데이터 로드: from datasets import load_dataset");
  console.log(`   3. dataset = load_dataset('json', data_files='${outPath}')`);
  console.log("   4. Qwen3-Coder 파인튜닝 시작!");
}

main().catch(console.error);
