import { useEffect, useRef, useState } from "react";
import { runJob, type Job } from "./engine";
import type { Request } from "./workers/engine";
/** Owns the one-at-a-time worker lifecycle, including synchronous startup failures. */
export function useWorkerJob() {
  const active = useRef<Job<unknown> | null>(null);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [jobLabel, setJobLabel] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  useEffect(() => () => active.current?.cancel(), []);
  async function execute<T>(request: Request): Promise<T | undefined> {
    if (active.current) return undefined;
    setBusy(true);
    setProgress(0);
    setJobLabel("Starting");
    setMessage("");
    setError(false);
    try {
      const running = runJob<T>(request, (value, label) => {
        setProgress(value);
        setJobLabel(label);
      });
      active.current = running;
      return await running.promise;
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : String(reason));
      return undefined;
    } finally {
      active.current = null;
      setBusy(false);
    }
  }
  return {
    busy,
    progress,
    jobLabel,
    message,
    setMessage,
    error,
    setError,
    execute,
    cancel: () => active.current?.cancel(),
  };
}
