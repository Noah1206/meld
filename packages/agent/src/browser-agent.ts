// ─── Browser Agent: Manus-style browser automation ──────────
// Persistent browser session that the agent controls.
// Uses Playwright when available, falls back to Firecrawl/fetch.

interface BrowserSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  currentUrl: string;
}

let session: BrowserSession | null = null;

async function getPlaywright() {
  try {
    return await import("playwright" as string);
  } catch {
    return null;
  }
}

async function ensureSession(): Promise<BrowserSession> {
  if (session?.browser?.isConnected?.()) return session;

  const pw = await getPlaywright();
  if (!pw) throw new Error("Playwright not installed. Install with: npx playwright install chromium");

  const browser = await pw.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  session = { browser, page, currentUrl: "" };
  return session;
}

export async function browserOpen(
  url: string,
  options?: { waitFor?: string; viewport?: { width: number; height: number }; serverUrl?: string },
): Promise<{ title: string; screenshot: string; content: string; url: string }> {
  try {
    const s = await ensureSession();

    if (options?.viewport) {
      await s.page.setViewportSize(options.viewport);
    }

    await s.page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    if (options?.waitFor) {
      await s.page.waitForSelector(options.waitFor, { timeout: 10000 }).catch(() => {});
    }

    // Wait for any animations to settle
    await s.page.waitForTimeout(500);

    s.currentUrl = s.page.url();
    const title = await s.page.title();
    const screenshotBuffer = await s.page.screenshot({ type: "png" });
    const screenshot = screenshotBuffer.toString("base64");

    // Extract readable text content
    const content = await s.page.evaluate(() => {
      const el = document.querySelector("main") || document.body;
      return el.innerText.slice(0, 5000);
    });

    return { title, screenshot, content, url: s.currentUrl };
  } catch (err) {
    // Fallback: use server-side browse API
    if (options?.serverUrl) {
      const res = await fetch(`${options.serverUrl}/api/browse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || "",
          screenshot: "",
          content: data.markdown?.slice(0, 5000) || "",
          url,
        };
      }
    }
    throw err;
  }
}

export async function browserClick(
  options: { selector?: string; text?: string },
): Promise<{ success: boolean; message: string }> {
  const s = await ensureSession();

  try {
    if (options.text) {
      // Click by text content
      await s.page.click(`text="${options.text}"`, { timeout: 5000 });
    } else if (options.selector) {
      await s.page.click(options.selector, { timeout: 5000 });
    } else {
      return { success: false, message: "Either selector or text is required" };
    }

    // Wait for navigation or network activity to settle
    await s.page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    s.currentUrl = s.page.url();

    return { success: true, message: `Clicked. Current URL: ${s.currentUrl}` };
  } catch (err) {
    return { success: false, message: `Click failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function browserType(
  selector: string,
  text: string,
  clearFirst = true,
): Promise<{ success: boolean; message: string }> {
  const s = await ensureSession();

  try {
    if (clearFirst) {
      await s.page.fill(selector, text, { timeout: 5000 });
    } else {
      await s.page.type(selector, text, { timeout: 5000 });
    }

    return { success: true, message: `Typed "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}" into ${selector}` };
  } catch (err) {
    return { success: false, message: `Type failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function browserScreenshot(
  options?: { analyze?: string; fullPage?: boolean; serverUrl?: string; apiKey?: string },
): Promise<{ screenshot: string; analysis: string }> {
  const s = await ensureSession();

  const buffer = await s.page.screenshot({
    type: "png",
    fullPage: options?.fullPage ?? false,
  });
  const screenshot = buffer.toString("base64");

  let analysis = "";
  if (options?.analyze && options?.serverUrl) {
    try {
      const res = await fetch(`${options.serverUrl}/api/ai/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: screenshot,
          prompt: options.analyze,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        analysis = data.analysis || data.text || "";
      }
    } catch {
      analysis = "Vision analysis unavailable";
    }
  }

  return { screenshot, analysis };
}

export async function browserEvaluate(
  script: string,
): Promise<{ result: string; success: boolean }> {
  const s = await ensureSession();

  try {
    const result = await s.page.evaluate(script);
    const serialized = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { result: serialized?.slice(0, 5000) || "(undefined)", success: true };
  } catch (err) {
    return { result: `Error: ${err instanceof Error ? err.message : String(err)}`, success: false };
  }
}

export async function browserScroll(
  direction: "up" | "down" | "top" | "bottom",
  amount = 500,
  selector?: string,
): Promise<{ success: boolean; message: string }> {
  const s = await ensureSession();

  try {
    if (selector) {
      await s.page.evaluate(
        ({ sel, dir, amt }: { sel: string; dir: string; amt: number }) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error(`Element not found: ${sel}`);
          if (dir === "top") el.scrollTop = 0;
          else if (dir === "bottom") el.scrollTop = el.scrollHeight;
          else if (dir === "down") el.scrollTop += amt;
          else el.scrollTop -= amt;
        },
        { sel: selector, dir: direction, amt: amount },
      );
    } else {
      if (direction === "top") await s.page.evaluate(() => window.scrollTo(0, 0));
      else if (direction === "bottom") await s.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      else if (direction === "down") await s.page.evaluate((amt: number) => window.scrollBy(0, amt), amount);
      else await s.page.evaluate((amt: number) => window.scrollBy(0, -amt), amount);
    }

    return { success: true, message: `Scrolled ${direction} ${direction === "top" || direction === "bottom" ? "" : `${amount}px`}` };
  } catch (err) {
    return { success: false, message: `Scroll failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function browserClose(): Promise<void> {
  if (session?.browser) {
    await session.browser.close().catch(() => {});
    session = null;
  }
}

export function isBrowserOpen(): boolean {
  return !!session?.browser?.isConnected?.();
}
