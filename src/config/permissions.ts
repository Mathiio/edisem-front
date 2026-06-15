export type Permission = 'admin' | 'create' | 'view';

/**
 * Hardcoded role → permissions mapping.
 * NEVER expose this in a UI or make it editable from the admin panel.
 * Roles come from Omeka S user table + 'student' for student-type users.
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  global_admin: ['admin', 'create', 'view'],
  site_admin:   ['admin', 'create', 'view'],
  admin:        ['admin', 'create', 'view'],
  editor:       ['create', 'view'],
  reviewer:     ['create', 'view'],
  author:       ['create', 'view'],
  researcher:   ['create', 'view'],
  student:      ['view'],
};

/**
 * Check if a user with the given role/type has a specific permission.
 * For students, the effective role is always 'student' regardless of Omeka role.
 */
export function hasPermission(
  userRole: string | undefined,
  userType: string | undefined,
  permission: Permission,
): boolean {
  const effectiveRole = userType === 'student' ? 'student' : (userRole || 'author');
  const permissions = ROLE_PERMISSIONS[effectiveRole] ?? ['view'];
  return permissions.includes(permission);
}

const ROLE_LABELS: Record<string, string> = {
  global_admin: 'Administrateur',
  site_admin:   'Administrateur',
  admin:        'Administrateur',
  editor:       'Éditeur',
  reviewer:     'Réviseur',
  author:       'Auteur',
  researcher:   'Chercheur',
  student:      'Étudiant',
};

export function getRoleLabel(role: string | undefined, type: string | undefined): string {
  if (type === 'student') return 'Étudiant';
  return ROLE_LABELS[role ?? ''] ?? 'Actant';
}
