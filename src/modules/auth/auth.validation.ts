import { z } from 'zod';
import { UserRoles } from '../../constant';

const SignupSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' }),
    email: z.string().email({ message: 'Invalid email address' }),
    phoneNumber: z
      .string()
      .min(10, { message: 'Phone number must be at least 10 characters long' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' }),
    role: z.enum(UserRoles, { message: 'Invalid role' }).optional(),
  }).strict(),
});

export const AuthValidation = { SignupSchema };
