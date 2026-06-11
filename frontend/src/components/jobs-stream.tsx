"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL, type Job } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks";
import { withToken } from "@/lib/auth";

/**
 * Global Server-Sent Events subscriber for the processing queue (D33).
 *
 * Mounted once at the app root so job progress keeps flowing into the React
 * Query cache regardless of which page is visible — this is what lets a job
 * keep running (and stay observable) after the user leaves Home (D19). The
 * worker owns execution; this only mirrors state into the client.
 */
export function JobsStream() {
  const qc = useQueryClient();
  const doneIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const handleSnapshot = (raw: string) => {
      let jobs: Job[];
      try {
        jobs = JSON.parse(raw) as Job[];
      } catch {
        return;
      }
      qc.setQueryData(queryKeys.jobs, jobs);

      // Invalidate tracks when a job newly completes so the library + Home
      // queue pick up the freshly analyzed track.
      let newlyDone = false;
      for (const job of jobs) {
        if (job.status === "done" && !doneIdsRef.current.has(job.id)) {
          doneIdsRef.current.add(job.id);
          newlyDone = true;
        }
      }
      if (newlyDone) {
        void qc.invalidateQueries({ queryKey: ["tracks"] });
      }
    };

    const connect = () => {
      if (closed) return;
      source = new EventSource(withToken(`${API_BASE_URL}/api/jobs/stream`));
      source.addEventListener("jobs", (e) => {
        handleSnapshot((e as MessageEvent).data);
      });
      source.onerror = () => {
        // EventSource auto-reconnects, but if it hard-fails we re-open shortly.
        if (source && source.readyState === EventSource.CLOSED) {
          source.close();
          source = null;
          if (!closed) retryTimer = setTimeout(connect, 3_000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (source) source.close();
    };
  }, [qc]);

  return null;
}
