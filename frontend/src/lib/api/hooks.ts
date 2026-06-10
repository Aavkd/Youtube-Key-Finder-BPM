"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type Job, type Track, type TrackUpdate } from "./client";
import type { components } from "./schema";

export type DiscoveryItem = components["schemas"]["DiscoveryItem"];

// Centralized query keys so cache invalidation stays consistent across phases.
export const queryKeys = {
  health: ["health"] as const,
  tracks: (params?: Record<string, unknown>) => ["tracks", params ?? {}] as const,
  track: (id: string) => ["track", id] as const,
  jobs: ["jobs"] as const,
  playlists: ["playlists"] as const,
  tags: ["tags"] as const,
};

/** Backend liveness — also the Phase 5 "sample query through the client". */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/health");
      if (error) throw new Error("Health check failed");
      return data;
    },
    retry: 1,
    staleTime: 30_000,
  });
}

/** The processing queue (newest first). Kept fresh by the SSE stream (D33). */
export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/jobs");
      if (error) throw new Error("Failed to load jobs");
      return data;
    },
    // The SSE stream pushes updates; this is the polling fallback (D33).
    refetchInterval: 5_000,
  });
}

/** Submit a YouTube URL to the queue (Home pill → POST /jobs). */
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source_url: string) => {
      const { data, error } = await api.POST("/api/jobs", {
        body: { source_url },
      });
      if (error || !data) throw new Error("Failed to submit URL");
      return data as Job;
    },
    onSuccess: (job) => {
      // Optimistically prepend so the queue shows it before the next snapshot.
      qc.setQueryData<Job[]>(queryKeys.jobs, (prev) =>
        prev ? [job, ...prev.filter((j) => j.id !== job.id)] : [job],
      );
      void qc.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

/** Delete a failed job (and its orphaned partial track). */
export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await api.DELETE("/api/jobs/{job_id}", {
        params: { path: { job_id: jobId } },
      });
      if (error) throw new Error("Failed to delete job");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

/** Re-queue a failed job (D17). */
export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await api.POST("/api/jobs/{job_id}/retry", {
        params: { path: { job_id: jobId } },
      });
      if (error || !data) throw new Error("Failed to retry job");
      return data as Job;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

/** A single track + metadata + alternatives (Player, D23/D24). */
export function useTrack(trackId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.track(trackId ?? ""),
    enabled: Boolean(trackId),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/tracks/{track_id}", {
        params: { path: { track_id: trackId as string } },
      });
      if (error || !data) throw new Error("Failed to load track");
      return data as Track;
    },
  });
}

/** Manual correction / favorite / persisted mood palette (PATCH, D24). */
export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TrackUpdate }) => {
      const { data, error } = await api.PATCH("/api/tracks/{track_id}", {
        params: { path: { track_id: id } },
        body: patch,
      });
      if (error || !data) throw new Error("Failed to update track");
      return data as Track;
    },
    onSuccess: (track) => {
      qc.setQueryData(queryKeys.track(track.id), track);
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

/** Library tracks with full filtering support (Phase 8, D41). */
export function useTracks(params?: {
  search?: string;
  favorite?: boolean;
  key?: string;
  tag?: string;
  status?: import("./schema").TrackStatus;
  bpm_min?: number;
  bpm_max?: number;
  sort?: string;
  order?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: queryKeys.tracks(params),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/tracks", {
        params: { query: params },
      });
      if (error) throw new Error("Failed to load tracks");
      return data ?? [];
    },
  });
}

// ─── Playlists ────────────────────────────────────────────────────────────────

/** All user-created playlists (sidebar + add-to menu, D22). */
export function usePlaylists() {
  return useQuery({
    queryKey: queryKeys.playlists,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/playlists");
      if (error) throw new Error("Failed to load playlists");
      return data ?? [];
    },
  });
}

/** Create a new playlist (D22). */
export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.POST("/api/playlists", { body: { name } });
      if (error || !data) throw new Error("Failed to create playlist");
      return data as import("./client").Playlist;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.playlists }),
  });
}

/** Rename a playlist. */
export function useUpdatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await api.PATCH("/api/playlists/{playlist_id}", {
        params: { path: { playlist_id: id } },
        body: { name },
      });
      if (error || !data) throw new Error("Failed to update playlist");
      return data as import("./client").Playlist;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.playlists }),
  });
}

/** Delete a playlist (does not delete tracks). */
export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/playlists/{playlist_id}", {
        params: { path: { playlist_id: id } },
      });
      if (error) throw new Error("Failed to delete playlist");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.playlists }),
  });
}

/** Add a track to a playlist. */
export function useAddTrackToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const { data, error } = await api.POST("/api/playlists/{playlist_id}/tracks", {
        params: { path: { playlist_id: playlistId } },
        body: { track_id: trackId },
      });
      if (error || !data) throw new Error("Failed to add track to playlist");
      return data as import("./client").Playlist;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.playlists }),
  });
}

/** Remove a track from a playlist. */
export function useRemoveTrackFromPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const { error } = await api.DELETE(
        "/api/playlists/{playlist_id}/tracks/{track_id}",
        { params: { path: { playlist_id: playlistId, track_id: trackId } } },
      );
      if (error) throw new Error("Failed to remove track from playlist");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.playlists }),
  });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

/** All tags. */
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/tags");
      if (error) throw new Error("Failed to load tags");
      return data ?? [];
    },
  });
}

/** Create a new tag. */
export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.POST("/api/tags", { body: { name } });
      if (error || !data) throw new Error("Failed to create tag");
      return data as import("./client").Tag;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.tags }),
  });
}

/** Attach an existing tag to a track. */
export function useAttachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, trackId }: { tagId: string; trackId: string }) => {
      const { error } = await api.POST("/api/tags/{tag_id}/tracks/{track_id}", {
        params: { path: { tag_id: tagId, track_id: trackId } },
      });
      if (error) throw new Error("Failed to attach tag");
    },
    onSuccess: (_, { trackId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.track(trackId) });
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

/** Detach a tag from a track. */
export function useDetachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, trackId }: { tagId: string; trackId: string }) => {
      const { error } = await api.DELETE("/api/tags/{tag_id}/tracks/{track_id}", {
        params: { path: { tag_id: tagId, track_id: trackId } },
      });
      if (error) throw new Error("Failed to detach tag");
    },
    onSuccess: (_, { trackId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.track(trackId) });
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

// ─── Track mutations ──────────────────────────────────────────────────────────

/** Delete a track from the library (D9). */
export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await api.DELETE("/api/tracks/{track_id}", {
        params: { path: { track_id: trackId } },
      });
      if (error) throw new Error("Failed to delete track");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

// ─── Discovery ───────────────────────────────────────────────────────────────

/** YouTube keyword search proxied through the backend (key never sent to client, D46). */
export function useDiscoverySearch(q: string | null) {
  return useQuery({
    queryKey: ["discovery", "search", q],
    enabled: Boolean(q),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/discovery/search", {
        params: { query: { q: q! } },
      });
      if (error) throw error;
      return (data ?? []) as DiscoveryItem[];
    },
    staleTime: 60_000,
  });
}

/** YouTube playlist items proxied through the backend (key never sent to client, D46). */
export function useDiscoveryPlaylist(url: string | null) {
  return useQuery({
    queryKey: ["discovery", "playlist", url],
    enabled: Boolean(url),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/discovery/playlist", {
        params: { query: { url: url ?? undefined } },
      });
      if (error) throw error;
      return (data ?? []) as DiscoveryItem[];
    },
    staleTime: 120_000,
  });
}

/** Queue a re-analysis job for an existing track (D24). */
export function useReanalyzeTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackId: string) => {
      const { data, error } = await api.POST("/api/tracks/{track_id}/reanalyze", {
        params: { path: { track_id: trackId } },
      });
      if (error || !data) throw new Error("Failed to queue reanalysis");
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.jobs });
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}
