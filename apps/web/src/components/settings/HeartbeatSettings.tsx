"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Plus, Trash2, Play, Square, Clock, Shield, AlertTriangle } from "lucide-react";

interface StandingOrder {
  instruction: string;
  autoAction: boolean;
}

interface HeartbeatConfig {
  intervalMinutes: number;
  standingOrders: StandingOrder[];
  autoActions: string[];
  askFirstActions: string[];
  notifications: string[];
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  intervalMinutes: 30,
  standingOrders: [
    { instruction: "Check dev server health", autoAction: true },
    { instruction: "Run npm run build — fix errors automatically", autoAction: true },
    { instruction: "Check for new error logs", autoAction: true },
  ],
  autoActions: [
    "Fix lint errors",
    "Fix TypeScript errors",
    "Restart crashed dev server",
    "Install missing packages",
  ],
  askFirstActions: [
    "Deploy to production",
    "Run database migrations",
    "Delete files",
    "Push to git",
  ],
  notifications: [
    "Build failure",
    "New runtime error",
    "Server crash",
  ],
};

interface HeartbeatSettingsProps {
  onSave: (config: HeartbeatConfig) => void;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  lastBeatAt?: string | null;
  beatCount?: number;
}

export function HeartbeatSettings({
  onSave,
  onStart,
  onStop,
  isRunning,
  lastBeatAt,
  beatCount = 0,
}: HeartbeatSettingsProps) {
  const [config, setConfig] = useState<HeartbeatConfig>(DEFAULT_CONFIG);
  const [newOrder, setNewOrder] = useState("");
  const [newAutoAction, setNewAutoAction] = useState("");
  const [newNotification, setNewNotification] = useState("");

  const addOrder = useCallback(() => {
    if (!newOrder.trim()) return;
    setConfig((prev) => ({
      ...prev,
      standingOrders: [...prev.standingOrders, { instruction: newOrder.trim(), autoAction: true }],
    }));
    setNewOrder("");
  }, [newOrder]);

  const removeOrder = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      standingOrders: prev.standingOrders.filter((_, i) => i !== index),
    }));
  }, []);

  const toggleAutoAction = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      standingOrders: prev.standingOrders.map((o, i) =>
        i === index ? { ...o, autoAction: !o.autoAction } : o
      ),
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className={`h-5 w-5 ${isRunning ? "text-red-400 animate-pulse" : "text-[#666]"}`} />
          <div>
            <h3 className="text-[14px] font-semibold text-white">Heartbeat</h3>
            <p className="text-[11px] text-[#888]">
              {isRunning
                ? `Active — ${beatCount} beats${lastBeatAt ? `, last: ${new Date(lastBeatAt).toLocaleTimeString()}` : ""}`
                : "Inactive"}
            </p>
          </div>
        </div>
        <button
          onClick={isRunning ? onStop : onStart}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
            isRunning
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          }`}
        >
          {isRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>

      {/* Interval */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-[#888]">
          <Clock className="mr-1 inline h-3 w-3" />
          Interval
        </label>
        <div className="flex items-center gap-2">
          <select
            value={config.intervalMinutes}
            onChange={(e) => setConfig({ ...config, intervalMinutes: parseInt(e.target.value) })}
            className="no-hover-fill rounded-lg border border-[#3A3A3A] bg-[#252525] px-3 py-2 text-[12px] text-white outline-none transition-colors focus:border-blue-500/50"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={360}>6 hours</option>
            <option value={1440}>Daily</option>
          </select>
        </div>
      </div>

      {/* Standing Orders */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-[#888]">
          <Shield className="mr-1 inline h-3 w-3" />
          Standing Orders
        </label>
        <div className="space-y-1.5">
          {config.standingOrders.map((order, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[#1E1E1E] px-3 py-2 ring-1 ring-white/[0.04]">
              <span className="flex-1 text-[12px] text-[#ccc]">{order.instruction}</span>
              <button
                onClick={() => toggleAutoAction(i)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  order.autoAction
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
                title={order.autoAction ? "Will execute automatically" : "Will ask user first"}
              >
                {order.autoAction ? "Auto" : "Ask"}
              </button>
              <button
                onClick={() => removeOrder(i)}
                className="text-[#666] hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOrder()}
              placeholder="Add standing order..."
              className="no-hover-fill flex-1 rounded-lg border border-[#3A3A3A] bg-[#252525] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
            <button
              onClick={addOrder}
              disabled={!newOrder.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-[#888]">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Alert When Detected
        </label>
        <div className="flex flex-wrap gap-1.5">
          {config.notifications.map((n, i) => (
            <span key={i} className="rounded-full bg-[#333] px-2.5 py-1 text-[11px] text-[#ccc]">
              {n}
              <button
                onClick={() =>
                  setConfig({ ...config, notifications: config.notifications.filter((_, j) => j !== i) })
                }
                className="ml-1.5 text-[#666] hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => onSave(config)}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-500"
      >
        Save Configuration
      </button>
    </div>
  );
}
