"use client";
/* eslint-disable react-hooks/static-components */
// Sandbox demo dashboard — renders several helper sub-components inline so
// they can close over local selection state. Lifting them out would require
// threading many props through long JSX trees with little runtime benefit,
// so we accept the react-compiler warning for this file only.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, X, Download, Search, Home, User, Sparkles, Loader2, Pin, Check,
  Bell, Settings, Heart, Star, Mail, Shield, Zap, Globe, Camera, Music,
  Lock, Eye, Edit3, Share2, Bookmark, Send, Calendar, Clock,
} from "lucide-react";
import { useDesignSystemStore } from "@/lib/store/design-system-store";
import { isLightColor, type PresetName } from "@/lib/design-system/palette";
import { generateDesignMd } from "@/lib/design-system/generate-md";
import type { ColorShades } from "@/lib/design-system/palette";

// ─── Color Card ───────────────────────────────────────
function ColorCard({
  label, hex, shades, onColorChange, position = "standalone",
}: {
  label: string; hex: string; shades: ColorShades; onColorChange: (hex: string) => void; position?: "top" | "middle" | "bottom" | "standalone";
}) {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
  const textColor = isLightColor(hex) ? "#000" : "#fff";
  const roundingClass = position === "top" ? "rounded-t-3xl" : position === "bottom" ? "rounded-b-3xl" : position === "middle" ? "" : "rounded-3xl";

  return (
    <div className={`overflow-hidden ${roundingClass} ring-1 ring-white/[0.08]`}>
      <label className="relative block cursor-pointer px-5 py-8" style={{ backgroundColor: hex }}>
        <input type="color" value={hex} onChange={(e) => onColorChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold" style={{ color: textColor }}>{label}</span>
          <span className="font-mono text-[13px] opacity-70" style={{ color: textColor }}>{hex.toUpperCase()}</span>
        </div>
      </label>
      <div className="flex">
        {steps.map((step) => (
          <div key={step} className="flex-1 py-12" style={{ backgroundColor: shades[step] }} title={`${step}: ${shades[step]}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Component Preview ────────────────────────────────
type ColorTarget = "bg" | "text" | "border";

function ComponentPreview({ primary, secondary, tertiary, activeColorIdx = 0, onSelectionChange }: {
  primary: string; secondary: string; tertiary: string; activeColorIdx?: number;
  onSelectionChange?: (selected: string | null, target: ColorTarget) => void;
}) {
  const onP = isLightColor(primary) ? "#000" : "#fff";
  const onS = isLightColor(secondary) ? "#000" : "#fff";
  const onT = isLightColor(tertiary) ? "#000" : "#fff";
  const palette = [primary, secondary, tertiary];
  const softBg = (hex: string) => isLightColor(hex) ? hex + "90" : hex + "30";
  const softFg = (hex: string) => isLightColor(hex) ? "#000" : hex;

  // Per-component bg/text/border color index
  const [bgIdx, setBgIdx] = useState<Record<string, number>>({});
  const [txtIdx, setTxtIdx] = useState<Record<string, number>>({});
  const [bdrIdx, setBdrIdx] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<ColorTarget>("bg");

  const setBg = (key: string, idx: number) => setBgIdx((p) => ({ ...p, [key]: idx }));
  const setTxt = (key: string, idx: number) => setTxtIdx((p) => ({ ...p, [key]: idx }));
  const setBd = (key: string, idx: number) => setBdrIdx((p) => ({ ...p, [key]: idx }));

  const getBg = (key: string, def = 0) => palette[(bgIdx[key] ?? def) % 3];
  const getTxt = (key: string, def = 0) => palette[(txtIdx[key] ?? def) % 3];
  const getBdr = (key: string, def = 0) => palette[(bdrIdx[key] ?? def) % 3];
  const getOnBg = (key: string, def = 0) => isLightColor(getBg(key, def)) ? "#000" : "#fff";

  const cycleBg = (key: string, def = 0) => setBgIdx((p) => ({ ...p, [key]: ((p[key] ?? def) + 1) % 3 }));
  const cycleTxt = (key: string, def = 0) => setTxtIdx((p) => ({ ...p, [key]: ((p[key] ?? def) + 1) % 3 }));
  const cycleBdr = (key: string, def = 0) => setBdrIdx((p) => ({ ...p, [key]: ((p[key] ?? def) + 1) % 3 }));
  const getColor = (key: string, def = 0) => getBg(key, def);
  const getOnColor = (key: string, def = 0) => getOnBg(key, def);

  // Apply color externally (when header color is clicked). Consumed via
  // applyColorRef so parents can trigger it as an imperative side-effect
  // rather than an effect-driven prop watcher (react-compiler happy).
  const applyColor = useCallback((colorIdx: number) => {
    if (!selected) return;
    if (colorTarget === "bg") setBgIdx((p) => ({ ...p, [selected]: colorIdx }));
    else if (colorTarget === "text") setTxtIdx((p) => ({ ...p, [selected]: colorIdx }));
    else if (colorTarget === "border") setBdrIdx((p) => ({ ...p, [selected]: colorIdx }));
  }, [selected, colorTarget]);

  // Track the last applied value so we only invoke applyColor on real changes.
  // NOTE: `applyColor` internally calls setState — this is a legitimate
  // "react to external prop change" pattern that predates react-compiler.
  // Refactoring to pure derivation would require lifting bg/txt/bdr state
  // to the parent, which is a much larger change.
  const lastAppliedRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!selected) return;
    if (lastAppliedRef.current === activeColorIdx) return;
    lastAppliedRef.current = activeColorIdx;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyColor(activeColorIdx);
  }, [activeColorIdx, selected, applyColor]);

  // Selection change callback
  useEffect(() => {
    onSelectionChange?.(selected, colorTarget);
  }, [selected, colorTarget, onSelectionChange]);

  const handleSelect = (id: string) => {
    setSelected(selected === id ? null : id);
  };

  const C = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
    <div
      className={`rounded-2xl bg-[#2C2C2C] p-5 transition-all cursor-pointer ${
        selected === id
          ? "ring-1 ring-white/40"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.10]"
      } ${className}`}
      onClick={(e) => { e.stopPropagation(); if (id) handleSelect(id); }}
    >
      {children}
      {selected === id && (
        <div className="mt-3 flex items-center gap-1 rounded-lg bg-[#1A1A1A] p-1" onClick={(e) => e.stopPropagation()}>
          {(["bg", "text", "border"] as ColorTarget[]).map((t) => (
            <button
              key={t}
              onClick={() => setColorTarget(t)}
              className={`flex-1 rounded-md py-1 text-[10px] font-medium transition-colors ${
                colorTarget === t ? "bg-[#E8E8E5] text-[#1A1A1A]" : "text-[#666] hover:text-[#9A9A95]"
              }`}
            >
              {t === "bg" ? "Background" : t === "text" ? "Text" : "Border"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C0C0BC]">{children}</p>
  );

  // Editable button
  // Use black text on light colors
  const visibleText = (hex: string) => isLightColor(hex) ? "#000" : hex;

  // Color popup: bg/text/border selection on double-click
  const [popup, setPopup] = useState<{ id: string; x: number; y: number } | null>(null);

  const openPopup = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopup({ id, x: rect.left, y: rect.bottom + 4 });
  };

  const ColorPopup = () => {
    if (!popup) return null;
    const { id, x, y } = popup;
    return (
      <div
        className="fixed z-50 animate-fade-in rounded-2xl bg-[#2C2C2C] p-3 shadow-xl ring-1 ring-white/[0.12]"
        style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y, window.innerHeight - 200) }}
      >
        {(["Background", "Text", "Border"] as const).map((prop) => {
          const set = prop === "Background" ? setBg : prop === "Text" ? setTxt : setBd;
          const current = prop === "Background" ? bgIdx[id] : prop === "Text" ? txtIdx[id] : bdrIdx[id];
          return (
            <div key={prop} className="mb-2.5 last:mb-0">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#666]">{prop}</p>
              <div className="flex gap-1.5">
                {palette.map((color, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); set(id, i); setPopup(null); }}
                    className={`h-7 w-7 rounded-lg transition-all hover:scale-110 ${current === i ? "ring-2 ring-[#1A1A1A] ring-offset-1" : "ring-1 ring-white/[0.08]"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  onClick={(e) => { e.stopPropagation(); set(id, -1); setPopup(null); }}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-[#2C2C2C] transition-all hover:scale-110 ${current === -1 ? "ring-2 ring-[#1A1A1A] ring-offset-1" : "ring-1 ring-white/[0.08]"}`}
                  title="Auto / None"
                >
                  <X className="h-3 w-3 text-[#666]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return;
    const close = () => setPopup(null);
    const timer = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [popup]);

  // Interactive button
  const IBtn = ({ id, label, filled = true, pill = false, defBg = 0, defTxt, defBdr }: {
    id: string; label: string; filled?: boolean; pill?: boolean; defBg?: number; defTxt?: number; defBdr?: number;
  }) => {
    const bg = filled ? getBg(id, defBg) : "transparent";
    const rawTxt = txtIdx[id] !== undefined ? getTxt(id, 0) : undefined;
    const txt = rawTxt ?? (filled ? getOnBg(id, defBg) : visibleText(getBg(id, defBg)));
    const rawBdr = bdrIdx[id] !== undefined ? getBdr(id, 0) : undefined;
    const bdr = rawBdr ?? (filled ? "transparent" : visibleText(getBg(id, defBg)));

    return (
      <button
        onDoubleClick={(e) => openPopup(id, e)}
        className={`w-full px-5 py-3 text-[13px] font-bold transition-all hover:opacity-90 ${pill ? "rounded-full" : "rounded-xl"}`}
        style={{ backgroundColor: bg, color: txt, border: `2px solid ${bdr}` }}
        title="Double-click to edit colors"
      >
        {label}
      </button>
    );
  };

  return (
    <div className="relative grid grid-cols-3 gap-3">
      <ColorPopup />
      {/* CTA / Hero Buttons */}
      <C id="cta">
        <Label>CTA Buttons</Label>
        <p className="mb-2 text-[9px] text-[#D4D4D0]">Double-click: bg · Shift+dbl: text · Right-click: border</p>
        <div className="flex flex-col gap-2">
          <button
            onDoubleClick={(e) => openPopup("cta-grad", e)}
            className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${getBg("cta-grad", 0)}, ${palette[(bgIdx["cta-grad"] ?? 1) % 3]})` }}
            title="Double-click to edit"
          >Get Started</button>
          <IBtn id="cta-fill" label="Sign Up Free" defBg={0} />
          <IBtn id="cta-out" label="Learn More" filled={false} defBg={0} defBdr={0} />
          <div className="flex gap-2">
            <IBtn id="cta-cancel" label="Cancel" defBg={1} />
            <IBtn id="cta-confirm" label="Confirm" defBg={0} />
          </div>
        </div>
      </C>

      {/* Navigation Bar */}
      <C id="nav">
        <Label>Navigation</Label>
        <div className="space-y-3">
          {/* Tab bar */}
          <div className="flex rounded-xl bg-[#F5F5F3] p-1">
            {["Dashboard", "Analytics", "Settings"].map((tab, i) => (
              <button
                key={tab}
                onDoubleClick={(e) => openPopup(`tab-${i}`, e)}
                className={`flex-1 rounded-lg py-2 text-[11px] font-semibold transition-all ${i === 0 ? "bg-[#2C2C2C] shadow-sm" : ""}`}
                style={i === 0 ? { color: visibleText(getBg(`tab-0`, 0)) } : { color: "#B4B4B0" }}
                title="Double-click to edit"
              >{tab}</button>
            ))}
          </div>
          {/* Sidebar nav */}
          <div className="space-y-0.5">
            {[
              { icon: Home, text: "Home", active: true },
              { icon: Search, text: "Explore", active: false },
              { icon: Bell, text: "Notifications", active: false },
              { icon: Settings, text: "Settings", active: false },
            ].map(({ icon: Icon, text, active }, i) => (
              <div
                key={text}
                onDoubleClick={(e) => { if (active) openPopup("nav-active", e); }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
                style={active ? { backgroundColor: softBg(getBg("nav-active", 0)), color: softFg(getBg("nav-active", 0)) } : { color: "#B4B4B0" }}
                title={active ? "Double-click: change active color" : ""}
              >
                <Icon className="h-4 w-4" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </C>

      {/* Form */}
      <C id="form">
        <Label>Form</Label>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-medium text-[#9A9A95]">Email</p>
            <div className="rounded-xl bg-[#F5F5F3] px-3.5 py-2.5 text-[12px] text-[#666]">you@example.com</div>
          </div>
          <div onDoubleClick={(e) => openPopup("form-focus", e)} className="cursor-pointer" title="Double-click to edit">
            <p className="mb-1 text-[11px] font-medium" style={{ color: visibleText(getBg("form-focus", 0)) }}>Password</p>
            <div className="rounded-xl px-3.5 py-2.5 text-[12px] text-[#E8E8E5]" style={{ boxShadow: `0 0 0 2px ${getBg("form-focus", 0)}` }}>••••••••</div>
          </div>
          <div onDoubleClick={(e) => openPopup("form-check", e)} className="flex cursor-pointer items-center gap-2" title="Double-click to edit">
            <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: getBg("form-check", 0) }}>
              <Check className="h-3 w-3" style={{ color: getOnBg("form-check", 0) }} />
            </div>
            <span className="text-[11px] text-[#9A9A95]">Remember me</span>
          </div>
          <IBtn id="form-submit" label="Log In" defBg={0} />
        </div>
      </C>

      {/* Status Badges */}
      <C id="status">
        <Label>Status & Tags</Label>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { text: "Active", idx: 0 },
              { text: "Pending", idx: 1 },
              { text: "Archived", idx: 2 },
            ].map(({ text, idx }) => (
              <span key={text} onDoubleClick={(e) => openPopup(`status-${idx}`, e)} className="cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all" style={{ backgroundColor: getColor(`status-${idx}`, idx), color: getOnColor(`status-${idx}`, idx) }} title="Double-click to edit">{text}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["Pro", "New", "Beta"].map((text, idx) => (
              <span key={text} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ backgroundColor: softBg(palette[idx]), color: softFg(palette[idx]) }}>{text}</span>
            ))}
          </div>
          {/* Dot indicators */}
          <div className="flex items-center gap-4">
            {["Online", "Away", "Busy"].map((text, i) => (
              <div key={text} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[i] }} />
                <span className="text-[11px] text-[#9A9A95]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </C>

      {/* Notification / Toast */}
      <C id="notif">
        <Label>Notifications</Label>
        <div className="space-y-2">
          {[
            { id: "notif-0", icon: Check, title: "Payment received", desc: "$49.00 from John D.", def: 0 },
            { id: "notif-1", icon: Bell, title: "New message", desc: "Sarah sent you a file", def: 1 },
            { id: "notif-2", icon: Mail, title: "Email verified", desc: "Your account is ready", def: 2 },
          ].map(({ id, icon: Icon, title, desc, def }) => (
            <div
              key={id}
              onDoubleClick={(e) => openPopup(id, e)}
              className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all"
              style={{ backgroundColor: softBg(getBg(id, def)), color: softFg(getBg(id, def)) }}
              title="Double-click to edit"
            >
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-bold">{title}</p>
                <p className="text-[10px] opacity-70">{desc}</p>
              </div>
            </div>
          ))}
          <div
            onDoubleClick={(e) => openPopup("notif-grad", e)}
            className="flex cursor-pointer items-start gap-3 rounded-xl p-3 text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${getBg("notif-grad", 0)}, ${palette[(bgIdx["notif-grad"] ?? 2) % 3]})` }}
            title="Double-click to edit"
          >
            <Zap className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-[12px] font-bold">Upgrade available</p>
              <p className="text-[10px] opacity-70">Try Pro features free</p>
            </div>
          </div>
        </div>
      </C>

      {/* Controls */}
      <C id="controls">
        <Label>Controls</Label>
        <div className="space-y-3">
          {[
            { id: "t-1", label: "Dark mode", idx: 0, on: true },
            { id: "t-2", label: "Notifications", idx: 1, on: true },
            { id: "t-3", label: "Analytics", idx: 2, on: false },
          ].map(({ id, label, idx, on }) => (
            <div key={id} onDoubleClick={(e) => openPopup(id, e)} className="flex cursor-pointer items-center justify-between" title="Double-click to edit">
              <span className="text-[12px] font-medium text-[#E8E8E5]">{label}</span>
              <div className="flex h-6 w-10 items-center rounded-full px-0.5 transition-colors" style={{ backgroundColor: on ? getColor(id, idx) : "#E5E5E5" }}>
                <div className="rounded-full bg-[#2C2C2C] shadow transition-all" style={{ height: 20, width: 20, marginLeft: on ? "auto" : 0 }} />
              </div>
            </div>
          ))}
          <div className="border-t border-black/[0.04] pt-3">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: palette[i] }}>
                  <Check className="h-3.5 w-3.5" style={{ color: [onP, onS, onT][i] }} />
                </div>
              ))}
              <div className="h-6 w-6 rounded-md ring-2 ring-[#E0E0DC]" />
              <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${primary}` }}>
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
              </div>
              <div className="h-6 w-6 rounded-full ring-2 ring-[#E0E0DC]" />
            </div>
          </div>
        </div>
      </C>
    </div>
  );
}

// ─── Brand Logos (Google Favicon API) ─────────────────
const fa = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
const LOGO_URLS: Record<string, string> = {
  spotify: fa("spotify.com"),
  notion: fa("notion.so"),
  linear: fa("linear.app"),
  stripe: fa("stripe.com"),
  figma: fa("figma.com"),
  vercel: fa("vercel.com"),
  airbnb: fa("airbnb.com"),
  github: fa("github.com"),
  slack: fa("slack.com"),
  discord: fa("discord.com"),
  youtube: fa("youtube.com"),
  instagram: fa("instagram.com"),
  dribbble: fa("dribbble.com"),
  shopify: fa("shopify.com"),
  twitch: fa("twitch.tv"),
  toss: fa("toss.im"),
  kakao: fa("kakaocorp.com"),
  baemin: fa("baemin.com"),
  coupang: fa("coupang.com"),
  naver: fa("naver.com"),
  line: fa("line.me"),
  "karrot": fa("daangn.com"),
  musinsa: fa("musinsa.com"),
  netflix: fa("netflix.com"),
  twitter: fa("x.com"),
  pinterest: fa("pinterest.com"),
  medium: fa("medium.com"),
  reddit: fa("reddit.com"),
  uber: fa("uber.com"),
  linkedin: fa("linkedin.com"),
  whatsapp: fa("whatsapp.com"),
  telegram: fa("telegram.org"),
  paypal: fa("paypal.com"),
  tiktok: fa("tiktok.com"),
  zoom: fa("zoom.us"),
  dropbox: fa("dropbox.com"),
  adobe: fa("adobe.com"),
  amazon: fa("amazon.com"),
  microsoft: fa("microsoft.com"),
  apple: fa("apple.com"),
  tesla: fa("tesla.com"),
  duolingo: fa("duolingo.com"),
  canva: fa("canva.com"),
  revolut: fa("revolut.com"),
  socar: fa("socar.kr"),
  zigbang: fa("zigbang.com"),
  yogiyo: fa("yogiyo.co.kr"),
  ridibooks: fa("ridibooks.com"),
  watcha: fa("watcha.com"),
  millie: fa("millie.co.kr"),
  class101: fa("class101.net"),
  banksalad: fa("banksalad.com"),
};

// ─── Popular App/Web Style Presets ────────────────────
const STYLE_PRESETS = [
  // ── Global ──
  { id: "spotify", label: "Spotify", desc: "Dark + green accent", category: "Music",
    primary: "#1DB954", secondary: "#191414", tertiary: "#B3B3B3", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "notion", label: "Notion", desc: "Minimal black & white", category: "Productivity",
    primary: "#000000", secondary: "#F7F6F3", tertiary: "#EB5757", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "linear", label: "Linear", desc: "Clean purple + dark", category: "Dev Tool",
    primary: "#5E6AD2", secondary: "#1B1B25", tertiary: "#F2C94C", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "stripe", label: "Stripe", desc: "Professional indigo", category: "Fintech",
    primary: "#635BFF", secondary: "#0A2540", tertiary: "#00D4AA", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "figma", label: "Figma", desc: "Multi-color design tool", category: "Design",
    primary: "#F24E1E", secondary: "#A259FF", tertiary: "#0ACF83", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "vercel", label: "Vercel", desc: "Monochrome + blue accent", category: "Platform",
    primary: "#000000", secondary: "#EAEAEA", tertiary: "#0070F3", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "airbnb", label: "Airbnb", desc: "Coral pink + teal", category: "Travel",
    primary: "#FF5A5F", secondary: "#00A699", tertiary: "#FC642D", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "github", label: "GitHub", desc: "Dark + blue + green", category: "Dev Platform",
    primary: "#24292F", secondary: "#0969DA", tertiary: "#1F883D", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "slack", label: "Slack", desc: "4-color brand palette", category: "Collaboration",
    primary: "#4A154B", secondary: "#36C5F0", tertiary: "#ECB22E", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "discord", label: "Discord", desc: "Indigo + mint green", category: "Community",
    primary: "#5865F2", secondary: "#57F287", tertiary: "#FEE75C", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "youtube", label: "YouTube", desc: "Red + dark", category: "Media",
    primary: "#FF0000", secondary: "#282828", tertiary: "#AAAAAA", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "instagram", label: "Instagram", desc: "Purple-pink-yellow", category: "Social",
    primary: "#E4405F", secondary: "#833AB4", tertiary: "#FCAF45", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "dribbble", label: "Dribbble", desc: "Pink design showcase", category: "Design",
    primary: "#EA4C89", secondary: "#F5F5F5", tertiary: "#444444", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "shopify", label: "Shopify", desc: "Lime green commerce", category: "E-Commerce",
    primary: "#96BF48", secondary: "#002E25", tertiary: "#F5A623", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "twitch", label: "Twitch", desc: "Purple + cyan", category: "Streaming",
    primary: "#9146FF", secondary: "#00F0FF", tertiary: "#1F1F23", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "netflix", label: "Netflix", desc: "Cinematic red + dark", category: "Streaming",
    primary: "#E50914", secondary: "#141414", tertiary: "#B81D24", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "twitter", label: "X (Twitter)", desc: "Black + sky blue", category: "Social",
    primary: "#000000", secondary: "#1D9BF0", tertiary: "#CFD9DE", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "pinterest", label: "Pinterest", desc: "Red + cream white", category: "Inspiration",
    primary: "#E60023", secondary: "#EFEFEF", tertiary: "#BD081C", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "medium", label: "Medium", desc: "Editorial serif", category: "Publishing",
    primary: "#000000", secondary: "#1A8917", tertiary: "#F2C94C", font: "Georgia", heading: "Georgia", scale: 1.333 },
  { id: "reddit", label: "Reddit", desc: "Orange + blue community", category: "Community",
    primary: "#FF4500", secondary: "#0079D3", tertiary: "#D7DADC", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "uber", label: "Uber", desc: "Black + blue + green", category: "Mobility",
    primary: "#000000", secondary: "#276EF1", tertiary: "#06C167", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "linkedin", label: "LinkedIn", desc: "Pro blue + white", category: "Career",
    primary: "#0A66C2", secondary: "#F3F2EF", tertiary: "#004182", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "whatsapp", label: "WhatsApp", desc: "Green messenger", category: "Messenger",
    primary: "#25D366", secondary: "#075E54", tertiary: "#128C7E", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "telegram", label: "Telegram", desc: "Sky blue messenger", category: "Messenger",
    primary: "#0088CC", secondary: "#FFFFFF", tertiary: "#34AADF", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "paypal", label: "PayPal", desc: "Navy + sky blue", category: "Fintech",
    primary: "#003087", secondary: "#009CDE", tertiary: "#012169", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "tiktok", label: "TikTok", desc: "Black + cyan + pink", category: "Social",
    primary: "#000000", secondary: "#00F2EA", tertiary: "#FF0050", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "zoom", label: "Zoom", desc: "Blue video call", category: "Communication",
    primary: "#2D8CFF", secondary: "#0B5CFF", tertiary: "#FFFFFF", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "dropbox", label: "Dropbox", desc: "Blue cloud storage", category: "Storage",
    primary: "#0061FF", secondary: "#B4D0E7", tertiary: "#1E1919", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "adobe", label: "Adobe", desc: "Red creative", category: "Creative",
    primary: "#FF0000", secondary: "#1A1A1A", tertiary: "#FFD600", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "amazon", label: "Amazon", desc: "Orange + dark", category: "E-Commerce",
    primary: "#FF9900", secondary: "#232F3E", tertiary: "#146EB4", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "microsoft", label: "Microsoft", desc: "4-color windows", category: "Platform",
    primary: "#00A4EF", secondary: "#F25022", tertiary: "#7FBA00", font: "Inter", heading: "Inter", scale: 1.25 },
  { id: "apple", label: "Apple", desc: "Minimal silver", category: "Platform",
    primary: "#000000", secondary: "#F5F5F7", tertiary: "#86868B", font: "SF Pro Display", heading: "SF Pro Display", scale: 1.25 },
  { id: "tesla", label: "Tesla", desc: "Red + black mobility", category: "Automotive",
    primary: "#CC0000", secondary: "#000000", tertiary: "#FFFFFF", font: "Inter", heading: "Inter", scale: 1.333 },
  { id: "duolingo", label: "Duolingo", desc: "Lime green education", category: "Education",
    primary: "#58CC02", secondary: "#FFC800", tertiary: "#CE82FF", font: "Nunito", heading: "Nunito", scale: 1.2 },
  { id: "canva", label: "Canva", desc: "Purple + cyan design", category: "Design",
    primary: "#7D2AE8", secondary: "#00C4CC", tertiary: "#FF7262", font: "Inter", heading: "Inter", scale: 1.2 },
  { id: "revolut", label: "Revolut", desc: "Dark + blue fintech", category: "Fintech",
    primary: "#0075EB", secondary: "#191C1F", tertiary: "#FFFFFF", font: "Inter", heading: "Inter", scale: 1.25 },
  // ── Korean ──
  { id: "toss", label: "Toss", desc: "Blue + navy + sky", category: "Fintech 🇰🇷",
    primary: "#0064FF", secondary: "#191F28", tertiary: "#3182F6", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "kakao", label: "Kakao", desc: "Yellow + brown", category: "Messenger 🇰🇷",
    primary: "#FEE500", secondary: "#3C1E1E", tertiary: "#391B1B", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "baemin", label: "Baemin", desc: "Mint + coral red", category: "Delivery 🇰🇷",
    primary: "#2AC1BC", secondary: "#FF6F61", tertiary: "#F9F5E7", font: "Pretendard", heading: "Pretendard", scale: 1.25 },
  { id: "coupang", label: "Coupang", desc: "Red + gold", category: "Commerce 🇰🇷",
    primary: "#C71E32", secondary: "#F5A623", tertiary: "#FAFAFA", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "naver", label: "Naver", desc: "Green + white", category: "Portal 🇰🇷",
    primary: "#03C75A", secondary: "#F5F6F8", tertiary: "#1EC800", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "line", label: "LINE", desc: "Green + light gray", category: "Messenger 🇰🇷",
    primary: "#06C755", secondary: "#B7B7B7", tertiary: "#FFFFFF", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "karrot", label: "Karrot", desc: "Orange + warm white", category: "Commerce 🇰🇷",
    primary: "#FF6F0F", secondary: "#FFF5EC", tertiary: "#FF9E44", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "musinsa", label: "Musinsa", desc: "Black + red accent", category: "Fashion 🇰🇷",
    primary: "#111111", secondary: "#FF0000", tertiary: "#F5F5F5", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "socar", label: "Socar", desc: "Sky blue + navy", category: "Mobility 🇰🇷",
    primary: "#00B0F0", secondary: "#003B73", tertiary: "#E8F7FF", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "zigbang", label: "Zigbang", desc: "Orange + dark", category: "Real Estate 🇰🇷",
    primary: "#FF6B00", secondary: "#222222", tertiary: "#FFF0E5", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "yogiyo", label: "Yogiyo", desc: "Hot pink + yellow", category: "Delivery 🇰🇷",
    primary: "#FA0050", secondary: "#FFD600", tertiary: "#2B2B2B", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "ridibooks", label: "Ridi", desc: "Purple + cyan blue", category: "Content 🇰🇷",
    primary: "#6E4AFF", secondary: "#00C8FF", tertiary: "#1A1033", font: "Pretendard", heading: "Pretendard", scale: 1.25 },
  { id: "watcha", label: "Watcha", desc: "Hot pink + dark", category: "Streaming 🇰🇷",
    primary: "#FF0558", secondary: "#1B1B1B", tertiary: "#FF5A8A", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "millie", label: "Millie", desc: "Mint + warm gray", category: "Books 🇰🇷",
    primary: "#5AC8C8", secondary: "#F5EDE3", tertiary: "#2D2D2D", font: "Pretendard", heading: "Pretendard", scale: 1.25 },
  { id: "class101", label: "Class101", desc: "Orange + dark", category: "Education 🇰🇷",
    primary: "#FF5600", secondary: "#1A1A1A", tertiary: "#FFE0CC", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
  { id: "banksalad", label: "BankSalad", desc: "Green + dark navy", category: "Fintech 🇰🇷",
    primary: "#00C853", secondary: "#0D1B2A", tertiary: "#A8EDBB", font: "Pretendard", heading: "Pretendard", scale: 1.2 },
];

// ─── AI Design Generator ──────────────────────────────
function AiDesignGenerator() {
  const { createSystem, updateSecondaryColor, updateTertiaryColor, updateTypography } = useDesignSystemStore();
  const [urlInput, setUrlInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("anthropic");
  const [keySaving, setKeySaving] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; label: string; sub: string; provider: string; hasKey: boolean }>>([]);
  const [selectedModelId, setSelectedModelId] = useState("claude-sonnet");

  // Load model list
  useState(() => {
    if (window.electronAgent?.ai?.getModels) {
      window.electronAgent.ai.getModels().then((m) => { if (m.length > 0) setModels(m); });
    }
  });

  // Provider list (deduplicated)
  const providers = [...new Map(models.map((m) => [m.provider, m])).values()];

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim() || !selectedProvider) return;
    setKeySaving(true);
    try {
      const ok = await window.electronAgent?.ai?.setApiKey(selectedProvider, apiKeyInput.trim());
      if (ok) {
        setShowKeySetup(false);
        setApiKeyInput("");
        setExtractError(null);
        // Refresh model list
        window.electronAgent?.ai?.getModels().then((m) => { if (m.length > 0) setModels(m); });
        // Auto-retry after saving key
        if (urlInput.trim()) {
          setTimeout(() => handleExtractUrl(), 300);
        }
      }
    } finally {
      setKeySaving(false);
    }
  };

  const applyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    createSystem(preset.label, preset.primary, preset.secondary, preset.tertiary);
    updateTypography({
      fontFamily: preset.font,
      headingFamily: preset.heading,
      scale: preset.scale,
    });
  };

  const handleExtractUrl = async () => {
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setIsGenerating(true);
    setExtractError(null);

    try {
      const agent = window.electronAgent;
      if (agent?.ai && typeof agent.ai.extractFromUrl === "function") {
        const c = await agent.ai.extractFromUrl(url, selectedModelId);
        createSystem(c.name || new URL(url).hostname, c.primary, c.secondary, c.tertiary);
        updateTypography({
          fontFamily: c.fontFamily || "Inter",
          headingFamily: c.headingFamily || c.fontFamily || "Inter",
          baseFontSize: c.baseFontSize || 16,
          scale: c.scale || 1.25,
        });
      } else {
        // Web: match preset by domain name
        const host = new URL(url).hostname.replace("www.", "");
        const matched = STYLE_PRESETS.find((p) => host.includes(p.id) || p.label.toLowerCase().includes(host.split(".")[0]));
        if (matched) applyPreset(matched);
        else {
          setExtractError("URL extraction is only available in the desktop app. Please select a preset.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      if (msg.includes("API key")) {
        setExtractError("API_KEY_NEEDED");
        setShowKeySetup(true);
      } else {
        setExtractError(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="px-8 py-10">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-[24px] font-bold tracking-tight text-[#E8E8E5]">Design System</h2>
        <p className="mt-1 text-[14px] text-[#9A9A95]">Define your project&apos;s design language</p>
      </div>

      {/* URL Extraction */}
      <div className="mb-10 rounded-2xl bg-[#2C2C2C] p-5 ring-1 ring-white/[0.08]">
        <div className="flex items-center gap-2 text-[#9A9A95]">
          <Search className="h-4 w-4" />
          <span className="text-[12px] font-semibold uppercase tracking-wider">Extract from URL</span>
        </div>
        <p className="mt-1 text-[13px] text-[#666]">Enter a website URL to automatically extract its design system</p>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleExtractUrl(); }}
            placeholder="https://example.com"
            className="flex-1 rounded-xl bg-[#2C2C2C] px-4 py-3 text-[13px] text-[#E8E8E5] ring-1 ring-white/[0.06] placeholder:text-[#666] focus:ring-white/[0.12] focus:outline-none"
            disabled={isGenerating}
          />
          {/* Model selection */}
          {models.length > 0 && (
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="rounded-xl bg-[#353535] px-3 py-3 text-[11px] font-medium text-[#9A9A95] ring-1 ring-white/[0.06] focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.hasKey}>
                  {m.label} {m.sub} {!m.hasKey ? "(key required)" : ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleExtractUrl}
            disabled={!urlInput.trim() || isGenerating}
            className="flex items-center gap-2 rounded-xl bg-[#E8E8E5] px-5 py-3 text-[13px] font-bold text-white transition-all hover:bg-[#444] active:scale-[0.97] disabled:opacity-40"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Extract
          </button>
        </div>
        {isGenerating && <p className="mt-3 text-[12px] text-[#666]">Analyzing website...</p>}

        {/* Inline API key setup */}
        {showKeySetup && (
          <div className="mt-4 rounded-xl bg-[#FFFBEB] p-4 ring-1 ring-amber-200">
            <p className="text-[13px] font-semibold text-amber-900">AI API key required</p>
            <p className="mt-1 text-[11px] text-amber-700">Select an AI provider and enter your API key</p>
            {/* Provider selection */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(providers.length > 0 ? providers : [{ provider: "anthropic", label: "Claude" }, { provider: "openai", label: "GPT" }, { provider: "google", label: "Gemini" }]).map((p) => (
                <button
                  key={p.provider}
                  onClick={() => setSelectedProvider(p.provider)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    selectedProvider === p.provider
                      ? "bg-[#E8E8E5] text-[#1A1A1A]"
                      : "bg-[#2C2C2C] text-[#9A9A95] ring-1 ring-amber-200 hover:bg-amber-50"
                  }`}
                >
                  {p.provider}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveKey(); }}
                placeholder={`${selectedProvider} API key...`}
                className="flex-1 rounded-lg bg-[#2C2C2C] px-3 py-2 text-[12px] text-[#E8E8E5] ring-1 ring-amber-200 placeholder:text-[#666] focus:outline-none focus:ring-amber-400"
                autoFocus
              />
              <button
                onClick={handleSaveKey}
                disabled={!apiKeyInput.trim() || keySaving}
                className="rounded-lg bg-[#E8E8E5] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#444] disabled:opacity-40"
              >
                {keySaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* General error */}
        {extractError && extractError !== "API_KEY_NEEDED" && (
          <p className="mt-3 text-[12px] text-red-500">{extractError}</p>
        )}
      </div>

      {/* Preset card grid */}
      <div>
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-[#666]">Or select a style</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="group flex items-center gap-4 rounded-2xl bg-[#2C2C2C] px-4 py-4 text-left ring-1 ring-white/[0.06] transition-all hover:bg-[#444] hover:ring-white/[0.12] active:scale-[0.98]"
            >
              {/* 3-color swatch */}
              <div className="flex h-12 w-[72px] flex-shrink-0 overflow-hidden rounded-xl">
                <div className="flex-1" style={{ backgroundColor: preset.primary }} />
                <div className="flex-1" style={{ backgroundColor: preset.secondary }} />
                <div className="flex-1" style={{ backgroundColor: preset.tertiary }} />
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <img src={LOGO_URLS[preset.id]} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                  <span className="truncate text-[14px] font-semibold text-[#E8E8E5]">{preset.label}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[#666]">{preset.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────
export function DesignSystemDashboard() {
  const {
    current, systems, createSystem, selectSystem, deleteSystem,
    updateSeedColor, updateSecondaryColor, updateTertiaryColor,
  } = useDesignSystemStore();

  const [creating, setCreating] = useState(false);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  // Local override — null means "derive from localStorage + current".
  const [pinnedOverride, setPinnedOverride] = useState<boolean | null>(null);
  const getDesignMd = useDesignSystemStore((s) => s.getDesignMd);

  const pinnedFromStorage =
    typeof window !== "undefined" && current
      ? window.localStorage.getItem("meld-active-design-system") === current.id
      : false;
  const pinned = pinnedOverride ?? pinnedFromStorage;
  const setPinned = setPinnedOverride;

  // Auto-sync: when pinned system changes, update localStorage
  useEffect(() => {
    if (pinned && current) {
      localStorage.setItem("meld-active-design-md", getDesignMd());
    }
  });

  const handlePin = () => {
    if (!current) return;
    if (pinned) {
      localStorage.removeItem("meld-active-design-system");
      localStorage.removeItem("meld-active-design-md");
      setPinned(false);
    } else {
      localStorage.setItem("meld-active-design-system", current.id);
      localStorage.setItem("meld-active-design-md", getDesignMd());
      setPinned(true);
    }
  };

  if (!current) return <AiDesignGenerator />;

  const { colors, typography, spacing, radius } = current;

  return (
    <div className="min-h-full bg-[#2C2C2C]">
      {/* Header: system chip tabs + actions */}
      <div className="sticky top-0 z-10 border-b border-[#3A3A3A] bg-[#2C2C2C]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-6 py-3">
          {/* System chips */}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {systems.map((sys) => (
              <div
                key={sys.id}
                role="button"
                tabIndex={0}
                onClick={() => selectSystem(sys.id)}
                onKeyDown={(e) => { if (e.key === "Enter") selectSystem(sys.id); }}
                className={`group flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                  current?.id === sys.id
                    ? "bg-[#E8E8E5] text-[#1A1A1A] shadow-sm"
                    : "bg-[#353535] text-[#9A9A95] ring-1 ring-white/[0.06] hover:bg-[#3A3A3A] hover:text-[#E8E8E5]"
                }`}
              >
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: current?.id === sys.id ? "#fff" : sys.colors.seedColor }} />
                {sys.name}
                {systems.length > 1 && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); deleteSystem(sys.id); }}
                    className={`ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                      current?.id === sys.id ? "hover:bg-[#2C2C2C]/20" : "hover:bg-white/[0.08]"
                    }`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            ))}
            {/* Create new chip */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { deleteSystem(current.id); }}
              onKeyDown={(e) => { if (e.key === "Enter") deleteSystem(current.id); }}
              className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#353535] px-3 py-1.5 text-[12px] text-[#666] ring-1 ring-white/[0.06] transition-colors hover:bg-[#3A3A3A] hover:text-[#9A9A95]"
            >
              <Plus className="h-3 w-3" />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Quick color pickers */}
            <div className="flex items-center gap-1 rounded-full bg-[#353535] px-1.5 py-0.5 ring-1 ring-white/[0.06]">
              {[
                { idx: 0, color: colors.seedColor, label: "Primary", onChange: updateSeedColor },
                { idx: 1, color: colors.secondary?.[500] || "#666", label: "Secondary", onChange: updateSecondaryColor },
                { idx: 2, color: colors.tertiary?.[500] || "#999", label: "Tertiary", onChange: updateTertiaryColor },
              ].map((c) => (
                <div key={c.idx} className="relative" title={c.label}>
                  <div
                    onClick={() => setActiveColorIdx(c.idx)}
                    className={`h-4 w-4 rounded-full cursor-pointer transition-all ${
                      activeColorIdx === c.idx ? "ring-2 ring-white scale-125" : "ring-1 ring-white/20 hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => c.onChange(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              ))}
            </div>

            <div className="h-4 w-px bg-[#3A3A3A]" />

            {/* Apply to project */}
            <button
              onClick={handlePin}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${
                pinned
                  ? "bg-[#E8E8E5] text-[#1A1A1A]"
                  : "bg-[#353535] text-[#9A9A95] ring-1 ring-white/[0.06] hover:bg-[#3A3A3A]"
              }`}
            >
              {pinned ? <Check className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              {pinned ? "Applied" : "Apply to Project"}
            </button>
            {/* Export */}
            <button
              onClick={() => {
                const md = generateDesignMd(current);
                const blob = new Blob([md], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `${current.name.replace(/\s+/g, "-").toLowerCase()}.md`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 rounded-full bg-[#353535] px-4 py-1.5 text-[11px] font-medium text-[#9A9A95] ring-1 ring-white/[0.06] hover:bg-[#3A3A3A]"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-3 animate-fade-in-up">

          {/* Row 1: 3 Color Cards + Gradient */}
          <div className="row-span-2">
            <div className="space-y-2">
              <ColorCard label="Primary" hex={colors.seedColor} shades={colors.primary} onColorChange={updateSeedColor} position="standalone" />
              <ColorCard label="Secondary" hex={(colors.secondarySeed ?? colors.secondary[500])} shades={colors.secondary} onColorChange={updateSecondaryColor} position="standalone" />
              <ColorCard label="Tertiary" hex={(colors.tertiarySeed ?? colors.tertiary[500])} shades={colors.tertiary} onColorChange={updateTertiaryColor} position="standalone" />
            </div>
          </div>

          {/* Headline */}
          <div className="rounded-3xl bg-[#2C2C2C] p-6 ring-1 ring-white/[0.06]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Headline</p>
            <p className="mt-4 text-[72px] font-bold leading-none text-[#E8E8E5]" style={{ fontFamily: typography.headingFamily || typography.fontFamily }}>Aa</p>
            <p className="mt-4 text-[11px] text-[#666]">{typography.headingFamily || typography.fontFamily} · Bold</p>
          </div>

          {/* Gradient - big */}
          <div className="col-span-2 row-span-2 overflow-hidden rounded-3xl">
            <div className="h-full" style={{ background: `linear-gradient(135deg, ${colors.seedColor}, ${(colors.secondarySeed ?? colors.secondary[500])}, ${(colors.tertiarySeed ?? colors.tertiary[500])})` }}>
              <div className="flex h-full flex-col justify-between p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: isLightColor(colors.seedColor) ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" }}>Gradient</p>
                <div>
                  <p className="text-[40px] font-bold leading-tight" style={{ color: isLightColor(colors.seedColor) ? "#000" : "#fff" }}>Brand<br />Gradient</p>
                  <p className="mt-3 font-mono text-[12px]" style={{ color: isLightColor(colors.seedColor) ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" }}>
                    {colors.seedColor} → {(colors.secondarySeed ?? colors.secondary[500])} → {(colors.tertiarySeed ?? colors.tertiary[500])}
                  </p>
                  <p className="mt-1 font-mono text-[10px]" style={{ color: isLightColor(colors.seedColor) ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)" }}>
                    linear-gradient(135deg, ...)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Body + Label */}
          <div className="rounded-3xl bg-[#2C2C2C] p-6 ring-1 ring-white/[0.06]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Body</p>
            <p className="mt-5 text-[64px] font-normal leading-none text-[#9A9A95]" style={{ fontFamily: typography.fontFamily }}>Aa</p>
            <p className="mt-4 text-[12px] text-[#666]">{typography.fontFamily} · {typography.baseFontSize}px</p>

            <div className="mt-6 border-t border-black/[0.04] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Label</p>
              <p className="mt-5 text-[52px] font-medium leading-none text-[#666]" style={{ fontFamily: typography.fontFamily }}>Aa</p>
              <p className="mt-4 text-[12px] text-[#666]">{typography.fontFamily} · {Math.round(typography.baseFontSize * 0.75)}px</p>
            </div>
          </div>

          {/* Row 3: Components - full width */}
          <div className="col-span-4">
            <ComponentPreview primary={colors.seedColor} secondary={(colors.secondarySeed ?? colors.secondary[500])} tertiary={(colors.tertiarySeed ?? colors.tertiary[500])} activeColorIdx={activeColorIdx} onSelectionChange={() => {}} />
          </div>

          {/* Row 4: Neutral + Radius (combined card) + Spacing + Type Scale */}
          <div className="col-span-2 rounded-3xl bg-[#2C2C2C] p-5 ring-1 ring-white/[0.06]">
            <div className="flex gap-6">
              {/* Neutral */}
              <div className="flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Neutral</span>
                <div className="mt-3 flex gap-1.5">
                  {["#fafafa","#e5e5e5","#a3a3a3","#525252","#171717"].map((c,i) => (
                    <div key={i} className="h-10 flex-1 rounded-lg" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div className="w-px bg-black/[0.04]" />
              {/* Border Radius */}
              <div className="flex-1">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Border Radius</p>
                <div className="flex gap-3">
                  {Object.entries(radius).filter(([k]) => k !== "full").map(([key, val]) => (
                    <div key={key} className="flex flex-col items-center gap-1.5">
                      <div className="h-10 w-10" style={{ borderRadius: `${val}px`, backgroundColor: colors.seedColor, opacity: 0.2 }} />
                      <span className="text-[10px] font-medium text-[#9A9A95]">{key}</span>
                      <span className="font-mono text-[9px] text-[#666]">{val}px</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-2 rounded-3xl bg-[#2C2C2C] p-6 ring-1 ring-white/[0.06]">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Spacing · {spacing.baseUnit}px base</p>
                <div className="space-y-2.5">
                  {spacing.scale.slice(1, 9).map((mult) => (
                    <div key={mult} className="flex items-center gap-3">
                      <span className="w-7 text-right font-mono text-[11px] text-[#666]">{mult * spacing.baseUnit}</span>
                      <div className="h-4 rounded-md" style={{ width: `${Math.min(mult * spacing.baseUnit * 3, 200)}px`, backgroundColor: colors.seedColor, opacity: 0.25 }} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">Type Scale · {typography.scale}</p>
                <div className="space-y-1.5">
                  {[3, 2, 1, 0, -1].map((exp) => {
                    const size = Math.round(typography.baseFontSize * Math.pow(typography.scale, exp));
                    return (
                      <div key={exp} className="flex items-baseline gap-3">
                        <span className="w-7 text-right font-mono text-[11px] text-[#666]">{size}</span>
                        <span className="text-[#E8E8E5]" style={{ fontSize: `${Math.min(size, 36)}px`, fontFamily: typography.fontFamily, lineHeight: 1.4, fontWeight: exp > 1 ? 700 : 400 }}>Aa</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
