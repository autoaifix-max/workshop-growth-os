export type ReadinessFailure =
  | "SUPABASE_CONFIGURATION_MISSING"
  | "CORE_SCHEMA_UNAVAILABLE"
  | "DATABASE_PERMISSION_DENIED"
  | "DATABASE_UNAVAILABLE";

export function classifyDatabaseError(code?: string): ReadinessFailure {
  if (code === "42501") return "DATABASE_PERMISSION_DENIED";
  if (["42P01", "PGRST204", "PGRST205"].includes(code ?? "")) {
    return "CORE_SCHEMA_UNAVAILABLE";
  }
  return "DATABASE_UNAVAILABLE";
}
