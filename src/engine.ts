import type { Request } from "./workers/engine";
export interface Job<T> {
  promise: Promise<T>;
  cancel: () => void;
}
export function runJob<T>(
  request: Request,
  onProgress?: (value: number, label: string) => void,
): Job<T> {
  const worker = new Worker(new URL("./workers/engine.ts", import.meta.url), {
    type: "module",
  });
  let rejectJob: (reason: Error) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    rejectJob = reject;
    worker.onmessage = ({ data }) => {
      if (data.kind === "progress") onProgress?.(data.value, data.label);
      else {
        worker.terminate();
        if (data.kind === "error") reject(new Error(data.message));
        else resolve(data.result);
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(
        new Error(
          e.message || "Worker failed. Reduce image size and try again.",
        ),
      );
    };
    try {
      worker.postMessage(request);
    } catch (error) {
      worker.terminate();
      reject(error);
    }
  });
  return {
    promise,
    cancel: () => {
      worker.terminate();
      rejectJob(new Error("Cancelled. Your project is unchanged."));
    },
  };
}
