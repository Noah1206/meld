import { NextRequest, NextResponse } from "next/server";

// ─── EC2 Instance Lifecycle Management ──────────
// Auto-stop idle instances, downsize inactive ones, track usage

interface InstanceRecord {
  userId: string;
  instanceId: string;
  status: "running" | "stopped" | "terminated";
  instanceType: string;
  lastActiveAt: number; // timestamp
  totalMinutes: number;
  costCents: number; // accumulated cost in cents
}

// In-memory store (in production, use Supabase)
const instances = new Map<string, InstanceRecord>();

// Cost per minute by instance type (in cents)
const COST_PER_MINUTE: Record<string, number> = {
  "t3.micro": 0.07,   // ~$0.04/hr
  "t3.medium": 0.07,  // ~$0.04/hr
};

const IDLE_STOP_MS = 15 * 60 * 1000;      // 15 min idle → stop
const IDLE_DOWNSIZE_MS = 5 * 60 * 1000;   // 5 min idle → downsize to micro

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "heartbeat": {
      // Called periodically by the agent server to report activity
      const { userId } = body;
      const record = instances.get(userId);
      if (record) {
        record.lastActiveAt = Date.now();
      }
      return NextResponse.json({ ok: true });
    }

    case "check_idle": {
      // Check all instances for idle timeout
      const now = Date.now();
      const actions: { userId: string; action: string }[] = [];

      for (const [userId, record] of instances) {
        if (record.status !== "running") continue;

        const idleMs = now - record.lastActiveAt;

        if (idleMs > IDLE_STOP_MS) {
          // Stop instance
          record.status = "stopped";
          actions.push({ userId, action: "stopped" });
          // In production: ec2.send(new StopInstancesCommand({ InstanceIds: [record.instanceId] }))
        } else if (idleMs > IDLE_DOWNSIZE_MS && record.instanceType === "t3.medium") {
          // Downsize to micro
          record.instanceType = "t3.micro";
          actions.push({ userId, action: "downsized" });
          // In production: modify instance type
        }
      }

      return NextResponse.json({ actions });
    }

    case "get_usage": {
      // Get usage stats for a user
      const { userId } = body;
      const record = instances.get(userId);
      if (!record) {
        return NextResponse.json({ totalMinutes: 0, costCents: 0, status: "none" });
      }
      return NextResponse.json({
        totalMinutes: record.totalMinutes,
        costCents: record.costCents,
        costDollars: (record.costCents / 100).toFixed(2),
        status: record.status,
        instanceType: record.instanceType,
        lastActiveAt: record.lastActiveAt,
      });
    }

    case "register": {
      const { userId, instanceId } = body;
      instances.set(userId, {
        userId,
        instanceId,
        status: "running",
        instanceType: "t3.medium",
        lastActiveAt: Date.now(),
        totalMinutes: 0,
        costCents: 0,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

// Periodic cost accumulation (called by cron or interval)
export async function GET() {
  const now = Date.now();
  for (const [, record] of instances) {
    if (record.status === "running") {
      record.totalMinutes += 1;
      record.costCents += COST_PER_MINUTE[record.instanceType] || 0.07;
    }
  }
  return NextResponse.json({ ok: true, count: instances.size });
}
