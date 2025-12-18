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
  }).strict(),
});

const verifyEmailSchema = z.object({
  query: z.object({
    token: z
      .string({
        error: 'Verify email token is required',
      })
      .min(1, 'Verify email token is required'),
  }).strict(),
});

const resendVerificationSchema = z.object({
  body: z
    .object({
      email: z.string().email({ message: 'Invalid email address' }),
    })
    .strict(),
})


const SigninSchema = z.object({
  body: z.object({
   
    email: z.string().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' }),
    
  }).strict(),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({
        error: 'Old Password is required',
      })
      .min(2, {
        message: 'Old Password too short.',
      }),
    newPassword: z
      .string({
        error: 'New Password is required',
      })
      .min(6, {
        message: 'New Password too short - should be 6 chars minimum',
      }),
  }),
});

const forgetPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({
        error: 'Email is required',
      })
      .email({
        message: 'Not a valid email',
      }),
  }),
});

const resetPasswordSchema = z.object({
  query: z.object({
    token: z
      .string({
        error: 'Forget password token is required',
      })
      .min(1, 'Forget password token is required'),
  }),
  body: z.object({
    newPassword: z
      .string({
        error: 'New Password is required',
      })
      .min(6, {
        message: 'New Password too short - should be 6 chars minimum',
      }),
  }),
});

export const AuthValidation = { SignupSchema, verifyEmailSchema, resendVerificationSchema, SigninSchema, changePasswordSchema, forgetPasswordSchema, resetPasswordSchema };
