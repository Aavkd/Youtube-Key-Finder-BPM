import createClient from "openapi-fetch";

import { clearToken, getToken, withToken } from "@/lib/auth";
import type { components, paths } from "./schema";

// Browser-facing backend base URL (set via NEXT_PUBLIC_API_BASE_URL).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Type-safe API client generated against the backend OpenAPI schema.
 * Every path/method/body/response is checked against `schema.d.ts`.
 */
export const api = createClient<paths>({ baseUrl: API_BASE_URL });

api.use({
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.dispatchEvent(new Event("kf-auth-expired"));
    }
    return response;
  },
});

/** Direct URL to stream a track's WAV master (Range-aware, for wavesurfer). */
export function trackAudioUrl(trackId: string): string {
  return withToken(`${API_BASE_URL}/api/tracks/${trackId}/audio`);
}

/** Direct URL to download a track with the `[BPM][Key] Title` filename (D29). */
export function trackDownloadUrl(
  trackId: string,
  format: "wav" | "mp3" = "wav",
): string {
  return withToken(`${API_BASE_URL}/api/tracks/${trackId}/download?format=${format}`);
}

// Convenience model aliases (do not redefine — re-exported from the schema).
export type HealthResponse = components["schemas"]["HealthResponse"];
export type Track = components["schemas"]["TrackRead"];
export type TrackUpdate = components["schemas"]["TrackUpdate"];
export type Job = components["schemas"]["JobRead"];
export type JobCreate = components["schemas"]["JobCreate"];
export type Tag = components["schemas"]["TagRead"];
export type Playlist = components["schemas"]["PlaylistRead"];
export type { JobStatus, TrackStatus } from "./schema";
