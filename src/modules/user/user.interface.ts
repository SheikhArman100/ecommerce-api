import { ENUM_USER_ROLE } from "../../enum/user";

export interface IUser {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    role: ENUM_USER_ROLE;
    isVerified: boolean;
    createdAt: Date;
    updatedAt?: Date;
    createdBy?: number;
    updatedBy?: number;
  }

export interface ICreateUserPayload {
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    role?: ENUM_USER_ROLE;
}

export interface IUpdateUserPayload {
    name?: string;
    phoneNumber?: string;
    role?: ENUM_USER_ROLE;
    isActive?: boolean;
}

export interface IUserFilters {
    searchTerm?: string;
    role?: string;
    email?: string;
    isVerified?: string;
    isActive?: string;
}
