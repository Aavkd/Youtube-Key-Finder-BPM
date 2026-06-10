// Back-compat shim: the typed client now lives in `@/lib/api/client`.
// Re-exported here so older imports keep working.
export { API_BASE_URL, api } from "./api/client";
export type { HealthResponse } from "./api/client";
