// Compare only the server-verified user id, never user-editable metadata.
export function isAdmin(user: { id: string; is_anonymous?: boolean } | null, adminId: string | undefined) {
  return Boolean(adminId && user && !user.is_anonymous && user.id === adminId);
}
