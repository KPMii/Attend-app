// 🛡️ Permission definitions — hardcoded in code, no DB needed for v1

export type Role = "student" | "faculty" | "student_council_officer" | "admin";

export type Permission =
  | "attendance:scan"
  | "attendance:view_own"
  | "attendance:view_any"
  | "attendance:edit"
  | "sessions:create_class"
  | "sessions:create_event"
  | "sessions:end"
  | "reports:view_own"
  | "reports:export"
  | "users:view"
  | "users:create"
  | "users:edit_own"
  | "users:edit_any"
  | "users:delete"
  | "users:assign_role"
  | "sections:view"
  | "sections:manage"
  | "subjects:manage"
  | "audit:view"
  | "admin:access";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: ["attendance:scan", "attendance:view_own"],

  faculty: [
    "attendance:view_own",
    "attendance:view_any",
    "attendance:edit",
    "sessions:create_class",
    "sessions:create_event",
    "sessions:end",
    "reports:view_own",
    "reports:export",
    "users:view",
    "users:edit_own",
    "users:assign_role",
    "sections:view",
  ],

  student_council_officer: [
    "attendance:scan",
    "attendance:view_own",
    "attendance:view_any",
    "sessions:create_event",
    "reports:view_own",
    "reports:export",
    "users:view",
    "users:edit_own",
    "sections:view",
  ],

  admin: [
    "attendance:scan",
    "attendance:view_own",
    "attendance:view_any",
    "attendance:edit",
    "sessions:create_class",
    "sessions:create_event",
    "sessions:end",
    "reports:view_own",
    "reports:export",
    "users:view",
    "users:create",
    "users:edit_own",
    "users:edit_any",
    "users:delete",
    "users:assign_role",
    "sections:view",
    "sections:manage",
    "subjects:manage",
    "audit:view",
    "admin:access",
  ],
};