import bcrypt, { compare } from 'bcrypt';
import status from 'http-status';
import { Secret } from 'jsonwebtoken';
import { prisma } from '../../client';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import { sendEmail } from '../../helpers/nodeMailer';
import { parseExpirationTime } from '../../utils/index';
import { IUser } from '../user/user.interface';
import { UserInfoFromToken } from '../../types/common';
import { ICheckUserResponse } from './auth.interface';

const signup = async (payload: IUser) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new ApiError(status.UNPROCESSABLE_ENTITY, 'Email already exists');
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
      role: 'user',
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
      role: newUser.role,
    },
    config.jwt.verify_email_secret as Secret,
    config.jwt.verify_email_expires_in as string,
  );
  // Send Email Verification Link
  sendEmail(
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

  return {
    id: newUser.id,
  };
};

const verifyEmail = async (token: string) => {
  let verifiedUser = null;

  verifiedUser = jwtHelpers.verifyToken(
    token,
    config.jwt.verify_email_secret as Secret,
  );

  const user = await prisma.user.findUnique({
    where: { email: verifiedUser.email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found!');
  }

  const updatedUser = await prisma.user.update({
    where: { email: verifiedUser.email },
    data: { isVerified: true },
  });
  return updatedUser;
};

const resendVerification = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found!');
  }

  if (user.isVerified) {
    throw new ApiError(status.BAD_REQUEST, 'Email is already verified.');
  }

  // Generate new verification token
  const emailVerifyToken = jwtHelpers.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.verify_email_secret as Secret,
    config.jwt.verify_email_expires_in as string,
  );

  // Send Email Verification Link
  sendEmail(
    user.email,
    `
    <div>
      <p>Hi, ${user.name}</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p>
        <a href="${config.admin_client_url}/auth/verify-email?token=${emailVerifyToken}">
          Verify Email
        </a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>Thank you!</p>
    </div>
    `,
    'Verify Your Email',
  );

  return {
    id: user.id,
  };
};

const signin = async (payload: IUser, ipAddress: string) => {
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
    config.jwt.access_expires_in as string,
  );

  // Generate Refresh Token
  const refreshToken = jwtHelpers.createToken(
    { id: user.id, role: user.role },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string,
  );

  // Store refresh token in DB
  const refreshExpiresIn = Number(
    parseExpirationTime(config.jwt.refresh_expires_in as string),
  );
  const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      ipAddress,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    role: user.role,
  };
};

const googleSignIn = async (payload: any, ipAddress: string) => {
  const { user, password, accessToken, refreshToken } = payload as any;

  // Store refresh token in DB
  const refreshExpiresIn = Number(
    parseExpirationTime(config.jwt.refresh_expires_in as string),
  );
  const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      ipAddress,
      expiresAt,
    },
  });

  try {
    await sendEmail(
      user.email!,
      `
        <p>Hi, ${user.name}</p>
        <p>Welcome to <strong>E-Commerce</strong>!</p>
        <p>We're excited to have you on board. Your registration has been successfully completed. Below are your signin details:</p>
        <p><strong>Email:</strong> ${user?.email}<br>
        <strong>Password:</strong> ${password}</p>
        
        
        <p>Thank you <br> E-Commerce</p>
        `,
      'Registration Completed Successfully',
    );
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new ApiError(status.INTERNAL_SERVER_ERROR, 'failed to send mail');
  }

  return {
    accessToken,
    refreshToken,
    role: user.role,
  };
};

const updateToken = async (refreshToken: string, ipAddress: string) => {
  const checkToken = await prisma.refreshToken.findFirst({
    where: { token: refreshToken },
    include: { user: true },
  });
  if (!checkToken || !checkToken.user) {
    throw new ApiError(status.UNAUTHORIZED, 'You are not authorized');
  }

  const verifiedUser = jwtHelpers.verifyToken(
    refreshToken,
    config.jwt.refresh_secret as Secret,
  );
  console.log(verifiedUser.id);
  console.log(checkToken.userId.toString());

  if (verifiedUser.id.toString() !== checkToken.userId.toString()) {
    throw new ApiError(status.UNAUTHORIZED, 'You are not authorized');
  }

  const newAccessToken = jwtHelpers.createToken(
    {
      id: checkToken.user.id,
      role: checkToken.user.role,
      email: checkToken.user.email,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as string,
  );

  // Generate Refresh Token
  const newRefreshToken = jwtHelpers.createToken(
    {
      id: checkToken.user.id,
      role: checkToken.user.role,
      email: checkToken.user.email,
    },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string,
  );

  // Store refresh token in DB
  const refreshExpiresIn = Number(
    parseExpirationTime(config.jwt.refresh_expires_in as string),
  );
  const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

  await prisma.refreshToken.update({
    where: { id: checkToken.id },
    data: { token: newRefreshToken, ipAddress, expiresAt },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    role: checkToken?.user.role,
  };
};

const signOut = async (refreshToken: string) => {
  return await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
};
const checkUser = async (refreshToken: string) => {
  const checkToken = await prisma.user.findFirst({
    where: {
      refreshTokens: {
        some: {
          token: refreshToken,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      detail:{
        select:{
          profileImage:true,
          image:{
            select:{
              path: true,
              originalName: true,
              modifiedName: true,
              type: true
            }
          }
        }
      }
      
    },
  });

  if (!checkToken) {
    throw new ApiError(status.UNAUTHORIZED, 'You are not authorized');
  }

  const verifiedUser = jwtHelpers.verifyToken(
    refreshToken,
    config.jwt.refresh_secret as Secret,
  );

  if (Number(verifiedUser.id) !== checkToken?.id) {
    throw new ApiError(status.UNAUTHORIZED, 'You are not authorized');
  }

  return checkToken;
};

const forgetPassword = async (payload: { email: string }) => {
  const findUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!findUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found.');
  }

  const forgetPasswordToken = jwtHelpers.createToken(
    { id: findUser?.id?.toString(), email: findUser.email },
    config.jwt.forget_password_secret as Secret,
    config.jwt.forget_password_expires_in as string,
  );

  // Send Forget Password Link
  sendEmail(
    findUser.email,
    `
    <div>
      <p>Hi, ${findUser.name} </p>
      <p>We are from E-commerce team. We noticed that you've requested a password reset for your account. If you've forgotten your password, please follow the link below within the next 3 minutes to set a new one: </p>
      <p>
        <span style="color:#000;text-align:center;font-weight:900">Reset password link: </span> <a href=${config.admin_client_url}/auth/reset-password?token=${forgetPasswordToken}>Click Here</a>
      </p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
      <p>Thank you <br> E-commerce</p>
    </div>
  `,
    'Password change link',
  );

  return {
    id: findUser.id,
  };
};

const resetPassword = async (
  token: string,
  newPassword: string,
  ipAddress: string,
) => {
  let verifiedUser = null;

  verifiedUser = jwtHelpers.verifyToken(
    token,
    config.jwt.forget_password_secret as Secret,
  );

  const user = await prisma.user.findUnique({
    where: { email: verifiedUser.email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found!');
  }

  // Hash the new password before saving
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.bcrypt_salt_rounds) || 10,
  );

  const updatedUser = await prisma.user.update({
    where: { email: verifiedUser.email },
    data: {
      password: hashedPassword,
      updatedBy: user.id,
    },
  });

  return { id: updatedUser.id };
};

const changePassword = async (
  userInfo: UserInfoFromToken,
  payload: { oldPassword: string; newPassword: string },
  ipAddress: string,
) => {
  const { oldPassword, newPassword } = payload;

  // Find user by ID
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User does not exist');
  }

  // Verify old password
  const isOldPasswordValid = await compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new ApiError(status.FORBIDDEN, 'Old Password is incorrect');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.bcrypt_salt_rounds) || 10,
  );

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: Number(userInfo.id) },
    data: {
      password: hashedNewPassword,
      updatedBy: Number(userInfo.id),
    },
    select: { id: true },
  });

  return { id: updatedUser.id };
};

export const AuthService = {
  signup,
  verifyEmail,
  resendVerification,
  signin,
  googleSignIn,
  updateToken,
  signOut,
  checkUser,
  forgetPassword,
  resetPassword,
  changePassword,
};
