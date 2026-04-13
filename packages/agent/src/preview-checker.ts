import * as path from "node:path";
import * as fs from "node:fs";

// ─── Preview Checker: Agent's "Eyes" ──────────────
// Uses Playwright to capture screenshots and Claude Vision to analyze them.
// Runs on EC2 where Playwright is installed, or falls back to basic checks.

interface CheckResult {
  success: boolean;
  screenshot?: string; // base64 encoded PNG
  analysis: string;
}

/**
 * Capture a screenshot of the dev server and analyze it with Claude Vision.
 * Falls back to HTTP health check if Playwright is not available.
 */
export async function checkPreview(
  devServerUrl: string,
  checkDescription: string,
  options?: {
    apiKey?: string;
    serverUrl?: string;
  },
): Promise<CheckResult> {
  // Try Playwright first (available on EC2)
  try {
    const screenshot = await captureWithPlaywright(devServerUrl);
    if (screenshot) {
      // Analyze with Claude Vision
      const analysis = await analyzeScreenshot(screenshot, checkDescription, options);
      return { success: true, screenshot, analysis };
    }
  } catch {
    // Playwright not available, fall back
  }

  // Fallback: basic HTTP health check
  try {
    const res = await fetch(devServerUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      return {
        success: true,
        analysis: `Dev server is responding (HTTP ${res.status}). Visual verification not available — Playwright not installed. Install it with: npx playwright install chromium`,
      };
    }
    return {
      success: false,
      analysis: `Dev server returned HTTP ${res.status}. The page may have errors.`,
    };
  } catch (err) {
    return {
      success: false,
      analysis: `Dev server is not reachable: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

async function captureWithPlaywright(url: string): Promise<string | null> {
  // Dynamic import — Playwright may not be installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pw: any;
  try {
    pw = await import("playwright" as string);
  } catch {
    return null; // Playwright not installed
  }

  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Wait a bit for any animations/renders to settle
    await page.waitForTimeout(1000);

    const buffer = await page.screenshot({ type: "png", fullPage: false });
    return buffer.toString("base64");
  } finally {
    await browser.close();
  }
}

async function analyzeScreenshot(
  screenshotBase64: string,
  checkDescription: string,
  options?: { apiKey?: string; serverUrl?: string },
): Promise<string> {
  const serverUrl = options?.serverUrl || "https://meld-psi.vercel.app";

  // Use Meld server to proxy Claude Vision call
  try {
    const res = await fetch(`${serverUrl}/api/ai/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: screenshotBase64,
        prompt: `You are reviewing a live preview of a web application.
Check if the following is true: "${checkDescription}"

Respond with:
1. PASS or FAIL
2. Brief explanation of what you see
3. If FAIL, what specifically is wrong

Be concise — 2-3 sentences max.`,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data = await res.json();
      return data.analysis || data.text || "Vision analysis unavailable";
    }

    return "Vision API unavailable. Screenshot captured but not analyzed.";
  } catch {
    return "Vision analysis failed. Screenshot captured but not analyzed.";
  }
}
