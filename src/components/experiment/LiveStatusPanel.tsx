"use client";

import { useCallback, useEffect, useState } from "react";

interface LoopStatus {
  liveVisitors: number;
  newVisitorsSinceSync: number;
  runVersion: number;
  readyToSync: boolean;
  nextSyncReason: string;
  lastSyncAt: string | null;
}

interface LoopResponse {
  status: LoopStatus;
  autoSync?: { synced: boolean; reason: string; runVersion?: number } | null;
}

export function LiveStatusPanel({ onSync }: { onSync?: () => void }) {
  const [data, setData] = useState<LoopResponse | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/loop");
      const json = (await res.json()) as LoopResponse;
      setData(json);
      if (json.autoSync?.synced) {
        setLastEvent(`Auto-synced · run v${json.autoSync.runVersion}`);
        onSync?.();
      }
    } catch {
      /* ignore poll errors */
    }
  }, [onSync]);

  useEffect(() => {
    void poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [poll]);

  const s = data?.status;

  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <p className="text-sm font-semibold text-emerald-900">Live</p>
      </div>

      <p className="mt-2 text-sm text-emerald-800">
        {s && s.liveVisitors > 0
          ? `${s.liveVisitors} visitor${s.liveVisitors === 1 ? "" : "s"} on variant pages. ${s.nextSyncReason}.`
          : "Send people to variant pages (e.g. /v/v0-baseline) — the loop recalibrates after 5 new sessions."}
      </p>

      {s && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/80 px-2 py-0.5 font-medium text-emerald-800">
            {s.liveVisitors} live visitor{s.liveVisitors === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-emerald-700">
            {s.newVisitorsSinceSync} new since sync
          </span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-emerald-700">
            Run v{s.runVersion}
          </span>
          {s.readyToSync && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
              Ready to sync
            </span>
          )}
        </div>
      )}

      {lastEvent && (
        <p className="mt-3 text-xs text-emerald-700">{lastEvent}</p>
      )}
    </div>
  );
}
