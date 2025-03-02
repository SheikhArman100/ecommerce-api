import { DiskTypeEnum } from "../enum/user";

export const UserRoles = ['admin', 'user'] as const;

export type UserRole = (typeof UserRoles)[number]
export const paginationFields = ['page', 'limit', 'sortBy', 'sortOrder'];

export const diskType: DiskTypeEnum[] = ['LOCAL', 'AWS', 'SHARED'];