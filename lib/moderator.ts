const MODERATOR_PERMISSION = "PERMISSION_REVIEW_POST";

export function hasModeratorPermission(permissions?: string[] | null) {
  return permissions?.includes(MODERATOR_PERMISSION) === true;
}
