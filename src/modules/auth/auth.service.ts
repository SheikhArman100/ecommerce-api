import bcrypt, { compare } from 'bcrypt';
import status from 'http-status';
import { Secret } from 'jsonwebtoken';
import { prisma } from '../../client';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import { sendEmail } from '../../helpers/nodeMailer';
import { parseExpirationTime } from '../../utils';
import { IUser } from '../user/user.interface';
import { ENUM_USER_ROLE } from '../../enum/user';

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
const signin = async (payload: IUser) => {
  const { email, password } = payload;

  // Find user in database
  const user = await prisma.user.findUnique({
    where: { email },
  });

  
  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User doesn't exist.");
  }

  
  if (!user.isVerified) {
    throw new ApiError(status.FORBIDDEN, 'Your account is not verified');
  }

  // Verify password using bcrypt
  const isPasswordValid = compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(status.UNPROCESSABLE_ENTITY, 'Password is incorrect.');
  }

  // Generate Access Token
  const accessToken = jwtHelpers.createToken(
    { id: user.id, role: user.role, email: user.email },
    config.jwt.access_secret as Secret,
    parseExpirationTime(config.jwt.access_expires_in as string),
  );

  // Generate Refresh Token
  const refreshToken = jwtHelpers.createToken(
    { id: user.id, role: user.role },
    config.jwt.refresh_secret as Secret,
    parseExpirationTime(config.jwt.refresh_expires_in as string),
  );

  // Store refresh token in DB
const refreshExpiresIn = Number(parseExpirationTime(config.jwt.refresh_expires_in as string))
const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
console.log(new Date());
console.log(expiresAt);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    role: user.role,
  };
};
export const AuthService = {
  signup,
  verifyEmail,
  signin
};
