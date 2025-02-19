import { UserRole } from "../../constant";


export interface IUser {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface IUserFilters {
    searchTerm?: string;
    role?: string;
    email?: string;
  }
  