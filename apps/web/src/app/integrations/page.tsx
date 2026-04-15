"use client";

// Standalone /integrations route — first-class entry point for
// managing MCP connections. Mirrors the Settings → Integrations tab
// so users can bookmark a direct URL and deep-link from marketing
// / onboarding without going through the settings shell.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MCPHubView } from "@/components/mcp/MCPHubView";

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-[12px] text-[#888] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-6 rounded-2xl bg-[#151515] p-8 ring-1 ring-white/[0.04]">
          <MCPHubView header />
        </div>
      </div>
    </div>
  );
}
