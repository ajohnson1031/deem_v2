import { apiFetch } from "@/src/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";

export type Money = { cents: number; currency: "USD" };

export type ConversionWithUi = {
  id: string;
  status: string;

  // UI fields (spread into conversion by backend)
  displayStatus: string;
  displaySubtitle?: string | null;
  processingPercent?: number | null;
  requiresBank?: boolean;
  isTerminal?: boolean;

  createdAt: string;
  updatedAt: string;

  sourceAmount: Money;
  fees: Money;
  netAmount: Money;

  xrpAmount?: number | null;
  failureReason?: string | null;
};

export type ConversionTimelineItem = {
  id: string;
  type: string;
  at: string;

  // normalizedEvent() output varies by kind; keep flexible
  kind: string;
  [key: string]: any;
};

export type ConversionTimelineResponse = {
  conversion: ConversionWithUi;
  timeline: ConversionTimelineItem[];
};

type Options = {
  token: string;
  conversionId: string;
  intervalMs?: number;
  enabled?: boolean;
};

export function useConversionTimeline({ token, conversionId, intervalMs = 1500, enabled = true }: Options) {
  const [data, setData] = useState<ConversionTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const tick = useCallback(async () => {
    try {
      const res = await apiFetch<ConversionTimelineResponse>(`/conversions/${conversionId}/timeline`, { method: "GET", token });

      setData(res);
      setError(null);

      if (res?.conversion?.isTerminal) stop();
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh conversion status.");
    } finally {
      setLoading(false);
    }
  }, [conversionId, stop, token]);

  useEffect(() => {
    if (!enabled) return;
    if (!conversionId || !token) return;

    stoppedRef.current = false;
    setLoading(true);
    setError(null);

    tick();

    timerRef.current = setInterval(() => {
      if (!stoppedRef.current) tick();
    }, intervalMs);

    return () => stop();
  }, [enabled, conversionId, intervalMs, stop, tick, token]);

  return { data, loading, error, refresh: tick, stop };
}
