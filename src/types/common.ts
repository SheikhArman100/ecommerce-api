import { DiskTypeEnum } from "../enum/user";

/**
 * All types of user roles
 */
export type Role =
  | 'super_admin'
  | 'admin'
  | 'regional_manager'
  | 'area_manager'
  | 'territory_manager'
  | 'field_officer'
  | 'merchant';

/**
 * User information in JWT token
 */
export type UserInfoFromToken = {
  id: string; 
  role: Role;
  email:string,
  iat: number;
  exp: number;
};

/**
 * Image / video or any type of file description
 */
export type FileType = {
  diskType: DiskTypeEnum;
  path: string;
  originalName: string;
  modifiedName: string;
};