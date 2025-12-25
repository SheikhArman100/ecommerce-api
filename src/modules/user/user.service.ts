import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import {
  IUser,
  ICreateUserPayload,
  IUpdateUserPayload,
  IUserFilters,
} from './user.interface';
import { IFile, IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { userSearchableFields } from './user.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import ErrorLogger from '../../logger/errorLogger';

const createUser = async (
  adminInfo: UserInfoFromToken,
  payload: ICreateUserPayload,
  multerFile?: IFile,
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
      isVerified: true,
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

  if (!data) {
    throw new ApiError(status.BAD_REQUEST, 'Failed to create user');
  }

  if (multerFile) {
    await prisma.userDetail.create({
      data: {
        userId: data.id,
        address: '',
        city: '',
        road: '',
        image: {
          create: {
            diskType: 'LOCAL',
            path: `user/images/${multerFile.filename}`,
            originalName: multerFile.originalname,
            modifiedName: multerFile.filename,
          },
        },
      },
    });
  }

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
        [field]:
          field.toLowerCase().endsWith('id') || field === 'id'
            ? Number(value)
            : typeof value === 'string' &&
                (value === 'true' || value === 'false')
              ? value === 'true'
              : value,
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
      isActive: true,
      createdAt: true,
      updatedAt: true,
      detail: {
        select: {
          profileImage: true,
          address: true,
          city: true,
          road: true,
          image: {
            select: {
              path: true,
              originalName: true,
              modifiedName: true,
              type: true
            }
          }
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
      isActive: true, 
      createdAt: true,
      updatedAt: true,
      detail: {
        select: {
          profileImage: true,
          address: true,
          city: true,
          road: true,
          image: {
            select: {
              path: true,
              originalName: true,
              modifiedName: true,
              type: true
            }
          }
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
  multerFile?: IFile,
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
      ...payload.name && { name: payload.name },
      ...payload.phoneNumber && { phoneNumber: payload.phoneNumber },
      ...payload.role && { role: payload.role },
      ...typeof payload.isActive === 'boolean' && { isActive: payload.isActive },
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

  // Handle profile image update
  if (multerFile) {
    const existingDetail = await prisma.userDetail.findUnique({
      where: { userId: Number(id) },
      include: { image: true },
    });

    if (existingDetail && existingDetail.image) {
      // Delete old image file from folder
      const oldImagePath = path.join(process.cwd(), 'uploads', existingDetail.image.path);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        // Log error but don't fail the update
        console.error('Error deleting old user image:', error);
        ErrorLogger.error(`Error deleting old user image: ${error}`);
      }

      // Update existing image record
      await prisma.file.update({
        where: { id: existingDetail.image.id },
        data: {
          path: `user/images/${multerFile.filename}`,
          originalName: multerFile.originalname,
          modifiedName: multerFile.filename,
        },
      });
    } else if (existingDetail) {
      // Create new image record for existing user detail
      await prisma.userDetail.update({
        where: { userId: Number(id) },
        data: {
          image: {
            create: {
              diskType: 'LOCAL',
              path: `user/images/${multerFile.filename}`,
              originalName: multerFile.originalname,
              modifiedName: multerFile.filename,
            },
          },
        },
      });
    } else {
      // Create new UserDetail with image
      await prisma.userDetail.create({
        data: {
          userId: Number(id),
          address: '',
          city: '',
          road: '',
          image: {
            create: {
              diskType: 'LOCAL',
              path: `user/images/${multerFile.filename}`,
              originalName: multerFile.originalname,
              modifiedName: multerFile.filename,
            },
          },
        },
      });
    }
  }

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
      isActive: true,
      createdAt: true,
      updatedAt: true,
      detail: {
        select: {
          profileImage: true,
          address: true,
          city: true,
          road: true,
          image: {
            select: {
              path: true,
              originalName: true,
              modifiedName: true,
              type: true
            }
          }
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
  payload: Partial<Pick<IUser, 'name' | 'phoneNumber'>> & {
    address?: string;
    city?: string;
    road?: string;
  },
  multerFile?: IFile,
) => {
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  // Separate User and UserDetail fields
  const { address, city, road, ...userFields } = payload;

  const data = await prisma.user.update({
    where: {
      id: Number(userInfo.id),
    },
    data: {
      ...userFields,
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

  // Handle UserDetail updates (address, city, road, and/or image)
  const hasDetailFields = address !== undefined || city !== undefined || road !== undefined || multerFile;

  if (hasDetailFields) {
    const existingDetail = await prisma.userDetail.findUnique({
      where: { userId: Number(userInfo.id) },
      include: { image: true },
    });

    const detailUpdateData: any = {};
    if (address !== undefined) detailUpdateData.address = address;
    if (city !== undefined) detailUpdateData.city = city;
    if (road !== undefined) detailUpdateData.road = road;

    if (multerFile) {
      if (existingDetail && existingDetail.image) {
        // Delete old image file from folder
        const oldImagePath = path.join(process.cwd(), 'uploads', existingDetail.image.path);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (error) {
          // Log error but don't fail the update
          console.error('Error deleting old profile image:', error);
          ErrorLogger.error(`Error deleting old profile image: ${error}`);
        }

        // Update existing image record
        await prisma.file.update({
          where: { id: existingDetail.image.id },
          data: {
            path: `user/images/${multerFile.filename}`,
            originalName: multerFile.originalname,
            modifiedName: multerFile.filename,
          },
        });
      } else {
        // Create new image record
        detailUpdateData.image = {
          create: {
            diskType: 'LOCAL',
            path: `user/images/${multerFile.filename}`,
            originalName: multerFile.originalname,
            modifiedName: multerFile.filename,
          },
        };
      }
    }

    if (existingDetail) {
      // Update existing UserDetail
      await prisma.userDetail.update({
        where: { userId: Number(userInfo.id) },
        data: detailUpdateData,
      });
    } else {
      // Create new UserDetail with default empty values for missing fields
      await prisma.userDetail.create({
        data: {
          userId: Number(userInfo.id),
          address: address || '',
          city: city || '',
          road: road || '',
          ...detailUpdateData,
        },
      });
    }
  }

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
