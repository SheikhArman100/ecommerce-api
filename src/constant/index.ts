export const UserRoles = ['super_admin', 'admin', 'user'] as const;

export type UserRole = (typeof UserRoles)[number]