import bcrypt from 'bcrypt';
import status from 'http-status';
import { Secret } from 'jsonwebtoken';
import { prisma } from '../../client';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import { sendEmail } from '../../helpers/nodeMailer';
import { parseExpirationTime } from '../../utils';
import { IUser } from '../user/user.interface';

const signup = async (payload: IUser) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email }, { phoneNumber: payload.phoneNumber }],
    },
  });
  if (existingUser) {
    throw new ApiError(
      status.UNPROCESSABLE_ENTITY,
      'Email or PhoneNumber already exists',
    );
  }

  // Hash the password
  if (!payload.password) {
    throw new ApiError(status.BAD_REQUEST, 'Password is required');
  }
  const hashedPassword = await bcrypt.hash(
    payload.password as string,
    Number(config.jwt.bcrypt_salt_rounds) || 10,
  );

  // Create user
  const newUser = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      password: hashedPassword,
      ...(payload.role && { role: payload.role }),
    },
  });
  if (!newUser) {
    throw new ApiError(status.INTERNAL_SERVER_ERROR, 'Signup failed!!!');
  }

  //send verifyToken
  const emailVerifyToken = jwtHelpers.createToken(
    {
      id: newUser.id,
      email: newUser.email,
      role:newUser.role
    },
    config.jwt.verify_email_secret as Secret,
    parseExpirationTime(config.jwt.verify_email_expires_in as string),
  );
  // Send Email Verification Link
  try {
    await sendEmail(
      newUser.email,
      `
      <div>
        <p>Hi, ${newUser.name}</p>
        <p>Welcome to E-Commerce! Please verify your email address by clicking the link below:</p>
        <p>
          <a href="${config.admin_client_url}/auth/verify-email?token=${emailVerifyToken}">
            Verify Email
          </a>
        </p>
        <p>This link will expire soon.</p>
        <p>If you didn't create this account, you can ignore this email.</p>
        <p>Thank you, <br> E-Commerce</p>
      </div>
      `,
      'Verify Your Email',
    );
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw an error; user should still be able to sign up
  }
  return {
    id:newUser.id
  }

};

const verifyEmail = async (token:string) => {
  let verifiedUser = null;

  verifiedUser = jwtHelpers.verifyToken(
    token,
    config.jwt.verify_email_secret as Secret,
  );

  const user = await prisma.user.findUnique({where:{email:verifiedUser.email}})

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found!');
  }

  const updatedUser = await prisma.user.update({
    where: { email: verifiedUser.email },
    data: { isVerified: true },
  });
  return updatedUser

}
export const AuthService = {
  signup,
  verifyEmail
};
