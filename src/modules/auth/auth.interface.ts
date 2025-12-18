import { ENUM_USER_ROLE } from '../../enum/user';

export interface IAuthUser {
  id: number;
  name: string;
  email: string;
  role: ENUM_USER_ROLE;
  isVerified: boolean;
  detail?: {
    profileImage: string | null;
    image?: {
      id: number;
      type: string;
      diskType: string;
      path: string;
      originalName: string;
      modifiedName: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  } | null;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IResetPasswordPayload {
  newPassword: string;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  role: ENUM_USER_ROLE;
}

export interface ICheckUserResponse extends IAuthUser {}
