/**
 * Typed API surface for the Key Finder backend.
 *
 * This file mirrors the FastAPI OpenAPI schema (backend `/openapi.json`) in the
 * shape emitted by `openapi-typescript`. It is the single source of truth for
 * request/response types consumed by `openapi-fetch` — do NOT hand-duplicate
 * types elsewhere.
 *
 * Regenerate from the live backend with:
 *   npm run gen:api      (uses $NEXT_PUBLIC_API_BASE_URL, default :8000)
 */

export interface paths {
  "/api/health": {
    get: operations["health_api_health_get"];
  };
  "/api/jobs": {
    get: operations["list_jobs_api_jobs_get"];
    post: operations["create_job_api_jobs_post"];
  };
  "/api/jobs/{job_id}": {
    get: operations["get_job_api_jobs__job_id__get"];
    delete: operations["delete_job_api_jobs__job_id__delete"];
  };
  "/api/jobs/{job_id}/retry": {
    post: operations["retry_job_api_jobs__job_id__retry_post"];
  };
  "/api/jobs/stream": {
    get: operations["stream_jobs_api_jobs_stream_get"];
  };
  "/api/tracks": {
    get: operations["list_tracks_api_tracks_get"];
  };
  "/api/tracks/{track_id}": {
    get: operations["get_track_api_tracks__track_id__get"];
    patch: operations["update_track_api_tracks__track_id__patch"];
    delete: operations["delete_track_api_tracks__track_id__delete"];
  };
  "/api/tracks/{track_id}/reanalyze": {
    post: operations["reanalyze_track_api_tracks__track_id__reanalyze_post"];
  };
  "/api/playlists": {
    get: operations["list_playlists_api_playlists_get"];
    post: operations["create_playlist_api_playlists_post"];
  };
  "/api/playlists/{playlist_id}": {
    get: operations["get_playlist_api_playlists__playlist_id__get"];
    patch: operations["update_playlist_api_playlists__playlist_id__patch"];
    delete: operations["delete_playlist_api_playlists__playlist_id__delete"];
  };
  "/api/playlists/{playlist_id}/tracks": {
    post: operations["add_track_api_playlists__playlist_id__tracks_post"];
  };
  "/api/playlists/{playlist_id}/tracks/{track_id}": {
    delete: operations["remove_track_api_playlists__playlist_id__tracks__track_id__delete"];
  };
  "/api/playlists/{playlist_id}/tracks/order": {
    put: operations["reorder_tracks_api_playlists__playlist_id__tracks_order_put"];
  };
  "/api/tags": {
    get: operations["list_tags_api_tags_get"];
    post: operations["create_tag_api_tags_post"];
  };
  "/api/tags/{tag_id}/tracks/{track_id}": {
    post: operations["attach_tag_api_tags__tag_id__tracks__track_id__post"];
    delete: operations["detach_tag_api_tags__tag_id__tracks__track_id__delete"];
  };
  "/api/discovery/search": {
    get: operations["search_videos_api_discovery_search_get"];
  };
  "/api/discovery/playlist": {
    get: operations["get_playlist_items_api_discovery_playlist_get"];
  };
}

export type TrackStatus =
  | "queued"
  | "downloading"
  | "analyzing"
  | "ready"
  | "error";

export type JobStatus =
  | "queued"
  | "downloading"
  | "analyzing"
  | "done"
  | "error";

export interface components {
  schemas: {
    HealthResponse: {
      status: string;
      service: string;
      version: string;
    };
    JobCreate: {
      source_url: string;
    };
    JobRead: {
      id: string;
      source_url: string;
      status: JobStatus;
      progress: number;
      error_msg?: string | null;
      track_id?: string | null;
      created_at: string;
    };
    TagRead: {
      id: string;
      name: string;
      user_id?: string | null;
    };
    TagCreate: {
      name: string;
      user_id?: string | null;
    };
    TrackRead: {
      id: string;
      user_id?: string | null;
      source_url: string;
      youtube_id?: string | null;
      title?: string | null;
      duration_sec?: number | null;
      thumbnail_url?: string | null;
      bpm?: number | null;
      bpm_alternatives?: unknown;
      bpm_confidence?: number | null;
      key?: string | null;
      key_alternatives?: unknown;
      key_confidence?: number | null;
      bpm_manual: boolean;
      key_manual: boolean;
      is_favorite: boolean;
      mood_palette?: unknown;
      audio_path_wav?: string | null;
      status: TrackStatus;
      created_at: string;
      updated_at: string;
      tags: components["schemas"]["TagRead"][];
    };
    TrackUpdate: {
      bpm?: number | null;
      bpm_alternatives?: unknown;
      bpm_confidence?: number | null;
      key?: string | null;
      key_alternatives?: unknown;
      key_confidence?: number | null;
      bpm_manual?: boolean | null;
      key_manual?: boolean | null;
      is_favorite?: boolean | null;
      mood_palette?: unknown;
      status?: TrackStatus | null;
    };
    PlaylistTrackRead: {
      track_id: string;
      position: number;
    };
    PlaylistRead: {
      id: string;
      name: string;
      user_id?: string | null;
      created_at: string;
      track_associations: components["schemas"]["PlaylistTrackRead"][];
    };
    PlaylistCreate: {
      name: string;
      user_id?: string | null;
    };
    PlaylistUpdate: {
      name?: string | null;
    };
    PlaylistTrackAdd: {
      track_id: string;
      position?: number | null;
    };
    PlaylistReorder: {
      track_ids: string[];
    };
    DiscoveryItem: {
      youtube_id: string;
      title: string;
      channel: string;
      thumbnail_url?: string | null;
    };
  };
}

type Track = components["schemas"]["TrackRead"];
type Job = components["schemas"]["JobRead"];

export interface operations {
  health_api_health_get: {
    responses: {
      200: { content: { "application/json": components["schemas"]["HealthResponse"] } };
    };
  };
  list_jobs_api_jobs_get: {
    responses: { 200: { content: { "application/json": Job[] } } };
  };
  create_job_api_jobs_post: {
    requestBody: { content: { "application/json": components["schemas"]["JobCreate"] } };
    responses: { 201: { content: { "application/json": Job } } };
  };
  get_job_api_jobs__job_id__get: {
    parameters: { path: { job_id: string } };
    responses: { 200: { content: { "application/json": Job } } };
  };
  delete_job_api_jobs__job_id__delete: {
    parameters: { path: { job_id: string } };
    responses: { 204: { content: never } };
  };
  retry_job_api_jobs__job_id__retry_post: {
    parameters: { path: { job_id: string } };
    responses: { 200: { content: { "application/json": Job } } };
  };
  stream_jobs_api_jobs_stream_get: {
    responses: { 200: { content: { "text/event-stream": string } } };
  };
  list_tracks_api_tracks_get: {
    parameters: {
      query?: {
        search?: string | null;
        favorite?: boolean | null;
        key?: string | null;
        tag?: string | null;
        status?: TrackStatus | null;
        bpm_min?: number | null;
        bpm_max?: number | null;
        sort?: string;
        order?: "asc" | "desc";
      };
    };
    responses: { 200: { content: { "application/json": Track[] } } };
  };
  get_track_api_tracks__track_id__get: {
    parameters: { path: { track_id: string } };
    responses: { 200: { content: { "application/json": Track } } };
  };
  update_track_api_tracks__track_id__patch: {
    parameters: { path: { track_id: string } };
    requestBody: { content: { "application/json": components["schemas"]["TrackUpdate"] } };
    responses: { 200: { content: { "application/json": Track } } };
  };
  delete_track_api_tracks__track_id__delete: {
    parameters: { path: { track_id: string } };
    responses: { 204: { content?: never } };
  };
  reanalyze_track_api_tracks__track_id__reanalyze_post: {
    parameters: { path: { track_id: string } };
    responses: {
      202: { content: { "application/json": { job_id: string; track_id: string } } };
    };
  };
  list_playlists_api_playlists_get: {
    responses: {
      200: { content: { "application/json": components["schemas"]["PlaylistRead"][] } };
    };
  };
  create_playlist_api_playlists_post: {
    requestBody: { content: { "application/json": components["schemas"]["PlaylistCreate"] } };
    responses: {
      201: { content: { "application/json": components["schemas"]["PlaylistRead"] } };
    };
  };
  get_playlist_api_playlists__playlist_id__get: {
    parameters: { path: { playlist_id: string } };
    responses: {
      200: { content: { "application/json": components["schemas"]["PlaylistRead"] } };
    };
  };
  update_playlist_api_playlists__playlist_id__patch: {
    parameters: { path: { playlist_id: string } };
    requestBody: { content: { "application/json": components["schemas"]["PlaylistUpdate"] } };
    responses: {
      200: { content: { "application/json": components["schemas"]["PlaylistRead"] } };
    };
  };
  delete_playlist_api_playlists__playlist_id__delete: {
    parameters: { path: { playlist_id: string } };
    responses: { 204: { content?: never } };
  };
  add_track_api_playlists__playlist_id__tracks_post: {
    parameters: { path: { playlist_id: string } };
    requestBody: { content: { "application/json": components["schemas"]["PlaylistTrackAdd"] } };
    responses: {
      201: { content: { "application/json": components["schemas"]["PlaylistRead"] } };
    };
  };
  remove_track_api_playlists__playlist_id__tracks__track_id__delete: {
    parameters: { path: { playlist_id: string; track_id: string } };
    responses: { 204: { content?: never } };
  };
  reorder_tracks_api_playlists__playlist_id__tracks_order_put: {
    parameters: { path: { playlist_id: string } };
    requestBody: { content: { "application/json": components["schemas"]["PlaylistReorder"] } };
    responses: {
      200: { content: { "application/json": components["schemas"]["PlaylistRead"] } };
    };
  };
  list_tags_api_tags_get: {
    responses: {
      200: { content: { "application/json": components["schemas"]["TagRead"][] } };
    };
  };
  create_tag_api_tags_post: {
    requestBody: { content: { "application/json": components["schemas"]["TagCreate"] } };
    responses: {
      201: { content: { "application/json": components["schemas"]["TagRead"] } };
    };
  };
  attach_tag_api_tags__tag_id__tracks__track_id__post: {
    parameters: { path: { tag_id: string; track_id: string } };
    responses: { 204: { content?: never } };
  };
  detach_tag_api_tags__tag_id__tracks__track_id__delete: {
    parameters: { path: { tag_id: string; track_id: string } };
    responses: { 204: { content?: never } };
  };
  search_videos_api_discovery_search_get: {
    parameters: {
      query: {
        q: string;
        max_results?: number;
      };
    };
    responses: {
      200: { content: { "application/json": components["schemas"]["DiscoveryItem"][] } };
      503: { content: { "application/json": { detail: string } } };
    };
  };
  get_playlist_items_api_discovery_playlist_get: {
    parameters: {
      query?: {
        url?: string | null;
        id?: string | null;
        max_results?: number;
      };
    };
    responses: {
      200: { content: { "application/json": components["schemas"]["DiscoveryItem"][] } };
      404: { content: { "application/json": { detail: string } } };
      503: { content: { "application/json": { detail: string } } };
    };
  };
}
