import { z } from "zod";
import { ENUM_USER_ROLE } from "../../enum/user";

const createUserSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .max(50, { message: 'Name must be at most 50 characters long' }),
    email: z
      .string()
      .email({ message: 'Invalid email address' }),
    phoneNumber: z
      .string()
      .min(10, { message: 'Phone number must be at least 10 characters long' })
      .max(15, { message: 'Phone number must be at most 15 characters long' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' })
      .max(100, { message: 'Password must be at most 100 characters long' }),
    role: z
      .enum([ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER])
      .optional(),
  }).strict(),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .max(50, { message: 'Name must be at most 50 characters long' })
      .optional(),
    phoneNumber: z
      .string()
      .min(10, { message: 'Phone number must be at least 10 characters long' })
      .max(15, { message: 'Phone number must be at most 15 characters long' })
      .optional(),
    role: z
      .enum([ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER])
      .optional(),
  }).strict(),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .max(50, { message: 'Name must be at most 50 characters long' })
      .optional(),
    phoneNumber: z
      .string()
      .min(10, { message: 'Phone number must be at least 10 characters long' })
      .max(15, { message: 'Phone number must be at most 15 characters long' })
      .optional(),
  }).strict(),
});

export const UserValidation = { createUserSchema, updateUserSchema, updateProfileSchema };
