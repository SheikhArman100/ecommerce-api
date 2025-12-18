import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IUser, ICreateUserPayload, IUpdateUserPayload, IUserFilters } from './user.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { userSearchableFields } from './user.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';
import bcrypt from 'bcrypt';

const createUser = async (
  adminInfo: UserInfoFromToken,
  payload: ICreateUserPayload,
) => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'Admin not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(status.CONFLICT, 'Email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  );

  const data = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      password: hashedPassword,
      role: payload.role || ENUM_USER_ROLE.USER,
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return data;
};

const getAllUsers = async (
  filters: IUserFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.UserWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: userSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          // mode: 'insensitive',
        },
      })),
    };
  }

  // Add other filter conditions
  if (Object.keys(filtersData).length) {
    whereConditions = {
      ...whereConditions,
      AND: Object.entries(filtersData).map(([field, value]) => ({
        [field]: (field.toLowerCase().endsWith('id') || field === 'id')
          ? Number(value)  
          : (typeof value === 'string' && (value === 'true' || value === 'false') ? value === 'true' : value), 
      })),
    };
  }

  const count = await prisma.user.count({ where: whereConditions });

  const result = await prisma.user.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      creator: {
        select: {
          name: true,
          email: true,
        },
      },
      updater: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data: result,
  };
};

const getUserByID = async (id: string) => {
  const data = await prisma.user.findUnique({
    where: {
      id: Number(id),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      detail: {
        select: {
          profileImage: true,
          address: true,
          city: true,
          road: true,
        },
      },
      creator: {
        select: {
          name: true,
          email: true,
        },
      },
      updater: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!data) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  return data;
};

const updateUser = async (
  id: string,
  payload: IUpdateUserPayload,
  adminInfo: UserInfoFromToken,
) => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'Admin not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  const checkUser = await prisma.user.findUnique({
    where: { id: Number(id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const data = await prisma.user.update({
    where: {
      id: Number(id),
    },
    data: {
      ...payload,
      updatedBy: Number(checkAdmin.id),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      updatedAt: true,
    },
  });

  return data;
};

const deleteUserByID = async (id: string, adminInfo: UserInfoFromToken) => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'Admin not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  const checkUser = await prisma.user.findUnique({
    where: { id: Number(id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  // Prevent admin from deleting themselves
  if (checkUser.id === checkAdmin.id) {
    throw new ApiError(status.BAD_REQUEST, 'Cannot delete your own account');
  }

  const data = await prisma.user.delete({
    where: {
      id: Number(id),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return data;
};

const getMyProfile = async (userInfo: UserInfoFromToken) => {
  const data = await prisma.user.findUnique({
    where: {
      id: Number(userInfo.id),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      detail: {
        select: {
          profileImage: true,
          address: true,
          city: true,
          road: true,
        },
      },
    },
  });

  if (!data) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  return data;
};

const updateMyProfile = async (
  userInfo: UserInfoFromToken,
  payload: Partial<Pick<IUser, 'name' | 'phoneNumber'>>,
) => {
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const data = await prisma.user.update({
    where: {
      id: Number(userInfo.id),
    },
    data: {
      ...payload,
      updatedBy: Number(userInfo.id),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      updatedAt: true,
    },
  });

  return data;
};

export const UserService = {
  createUser,
  getAllUsers,
  getUserByID,
  updateUser,
  deleteUserByID,
  getMyProfile,
  updateMyProfile,
};
