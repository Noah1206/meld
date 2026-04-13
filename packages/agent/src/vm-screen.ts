// ─── VM Screen: AI's virtual computer screen ──────────
// The AI operates a headless browser inside the VM.
// The user watches the same screen via WebSocket streaming.
// Like Manus: one screen, AI controls, user watches.

import type { AgentEvent } from "@figma-code-bridge/shared";

interface ScreenFrame {
  timestamp: number;
  screenshot: string; // base64 PNG
  url: string;
  title: string;
  cursor?: { x: number; y: number }; // AI's cursor position
  action?: string; // What AI is doing: "clicking", "typing", "scrolling", "waiting"
}

interface VMScreenConfig {
  /** How often to capture frames (ms). Default: 1000 (1fps for efficiency) */
  captureInterval: number;
  /** Viewport size */
  viewport: { width: number; height: number };
  /** Callback to stream frames to user */
  onFrame: (frame: ScreenFrame) => void;
  /** Callback for agent events */
  onEvent: (event: AgentEvent) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browser: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let page: any = null;
let captureTimer: ReturnType<typeof setInterval> | null = null;
let config: VMScreenConfig | null = null;
let lastFrameHash = "";

async function getPlaywright() {
  try {
    return await import("playwright" as string);
  } catch {
    return null;
  }
}

/**
 * Boot the VM screen — starts a persistent browser that AI controls
 * and user watches via frame streaming.
 */
export async function bootVMScreen(cfg: VMScreenConfig): Promise<boolean> {
  config = cfg;

  const pw = await getPlaywright();
  if (!pw) {
    config.onEvent({
      type: "error",
      message: "Playwright not installed. VM screen requires: npx playwright install chromium",
    } as AgentEvent);
    return false;
  }

  browser = await pw.chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  page = await browser.newPage({
    viewport: cfg.viewport,
  });

  // Navigate to blank page initially
  await page.goto("about:blank");

  // Start frame capture loop
  startFrameCapture();

  return true;
}

/**
 * Capture frames periodically and stream to user.
 * Only sends frame if screen changed (hash comparison).
 */
function startFrameCapture() {
  if (!config || captureTimer) return;

  captureTimer = setInterval(async () => {
    if (!page || !config) return;

    try {
      const buffer = await page.screenshot({ type: "jpeg", quality: 60 });
      const screenshot = buffer.toString("base64");

      // Simple change detection — skip if same as last frame
      const frameHash = screenshot.slice(0, 100); // Quick hash from first bytes
      if (frameHash === lastFrameHash) return;
      lastFrameHash = frameHash;

      const url = page.url();
      const title = await page.title().catch(() => "");

      config.onFrame({
        timestamp: Date.now(),
        screenshot,
        url,
        title,
      });
    } catch {
      // Page might be navigating, skip this frame
    }
  }, config.captureInterval);
}

function stopFrameCapture() {
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
}

// ─── AI Control Methods (same screen the user watches) ───

/**
 * Navigate to a URL — user sees the page load in real-time
 */
export async function vmNavigate(
  url: string,
  options?: { waitFor?: string },
): Promise<{ success: boolean; title: string; url: string }> {
  if (!page) throw new Error("VM screen not booted");

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    if (options?.waitFor) {
      await page.waitForSelector(options.waitFor, { timeout: 10000 }).catch(() => {});
    }

    await page.waitForTimeout(500);

    const title = await page.title();
    const finalUrl = page.url();

    // Send immediate frame after navigation
    await captureAndSendFrame("navigated");

    return { success: true, title, url: finalUrl };
  } catch (err) {
    return { success: false, title: "", url: page.url() };
  }
}

/**
 * Click an element — user sees the cursor move and click
 */
export async function vmClick(
  options: { selector?: string; text?: string; position?: { x: number; y: number } },
): Promise<{ success: boolean; message: string }> {
  if (!page) throw new Error("VM screen not booted");

  try {
    let targetBox: { x: number; y: number; width: number; height: number } | null = null;

    if (options.position) {
      // Click at exact coordinates
      await page.mouse.click(options.position.x, options.position.y);
      sendCursorFrame(options.position.x, options.position.y, "clicking");
    } else if (options.text) {
      const locator = page.getByText(options.text, { exact: false }).first();
      targetBox = await locator.boundingBox().catch(() => null);
      await locator.click({ timeout: 5000 });
    } else if (options.selector) {
      const locator = page.locator(options.selector).first();
      targetBox = await locator.boundingBox().catch(() => null);
      await locator.click({ timeout: 5000 });
    } else {
      return { success: false, message: "Provide selector, text, or position" };
    }

    // Show cursor at click position
    if (targetBox) {
      sendCursorFrame(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        "clicking",
      );
    }

    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await captureAndSendFrame("clicked");

    return { success: true, message: `Clicked. URL: ${page.url()}` };
  } catch (err) {
    return { success: false, message: `Click failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Type into an input — user sees text appearing
 */
export async function vmType(
  selector: string,
  text: string,
  clearFirst = true,
): Promise<{ success: boolean; message: string }> {
  if (!page) throw new Error("VM screen not booted");

  try {
    const locator = page.locator(selector).first();
    const box = await locator.boundingBox().catch(() => null);

    if (box) {
      sendCursorFrame(box.x + box.width / 2, box.y + box.height / 2, "typing");
    }

    if (clearFirst) {
      await locator.fill(text, { timeout: 5000 });
    } else {
      // Type character by character for visual effect
      await locator.click();
      for (const char of text) {
        await page.keyboard.type(char, { delay: 30 });
      }
    }

    await captureAndSendFrame("typed");

    return { success: true, message: `Typed "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"` };
  } catch (err) {
    return { success: false, message: `Type failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Scroll the page — user sees the page scrolling
 */
export async function vmScroll(
  direction: "up" | "down" | "top" | "bottom",
  amount = 500,
): Promise<{ success: boolean }> {
  if (!page) throw new Error("VM screen not booted");

  try {
    if (direction === "top") await page.evaluate(() => window.scrollTo(0, 0));
    else if (direction === "bottom") await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    else if (direction === "down") await page.evaluate((a: number) => window.scrollBy(0, a), amount);
    else await page.evaluate((a: number) => window.scrollBy(0, -a), amount);

    await captureAndSendFrame("scrolled");
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Take a screenshot for AI analysis — same screen user is watching
 */
export async function vmScreenshot(): Promise<{ screenshot: string; url: string; title: string }> {
  if (!page) throw new Error("VM screen not booted");

  const buffer = await page.screenshot({ type: "png" });
  const screenshot = buffer.toString("base64");
  const url = page.url();
  const title = await page.title().catch(() => "");

  return { screenshot, url, title };
}

/**
 * Execute JavaScript in the page context
 */
export async function vmEvaluate(script: string): Promise<{ result: string; success: boolean }> {
  if (!page) throw new Error("VM screen not booted");

  try {
    const result = await page.evaluate(script);
    const serialized = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    await captureAndSendFrame("evaluated");
    return { result: serialized?.slice(0, 5000) || "(undefined)", success: true };
  } catch (err) {
    return { result: `Error: ${err instanceof Error ? err.message : String(err)}`, success: false };
  }
}

/**
 * Get current page info without screenshot
 */
export async function vmPageInfo(): Promise<{ url: string; title: string }> {
  if (!page) return { url: "", title: "" };
  return {
    url: page.url(),
    title: await page.title().catch(() => ""),
  };
}

// ─── Internal helpers ───

async function captureAndSendFrame(action: string) {
  if (!page || !config) return;
  try {
    const buffer = await page.screenshot({ type: "jpeg", quality: 60 });
    const screenshot = buffer.toString("base64");
    config.onFrame({
      timestamp: Date.now(),
      screenshot,
      url: page.url(),
      title: await page.title().catch(() => ""),
      action,
    });
  } catch { /* ignore */ }
}

function sendCursorFrame(x: number, y: number, action: string) {
  if (!config) return;
  // Send cursor position without full screenshot (lightweight)
  config.onFrame({
    timestamp: Date.now(),
    screenshot: "", // Empty = just cursor update
    url: page?.url() || "",
    title: "",
    cursor: { x: Math.round(x), y: Math.round(y) },
    action,
  });
}

/**
 * Shutdown VM screen
 */
export async function shutdownVMScreen(): Promise<void> {
  stopFrameCapture();
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    page = null;
  }
  config = null;
  lastFrameHash = "";
}

/**
 * Check if VM screen is running
 */
export function isVMScreenRunning(): boolean {
  return !!browser && !!page;
}
