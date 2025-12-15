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
      role: newUser.role,
    },
    config.jwt.verify_email_secret as Secret,
    config.jwt.verify_email_expires_in as string,
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
    throw new ApiError(status.INTERNAL_SERVER_ERROR, 'failed to send mail');
  }
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
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    role: user.role,
  };
};

const googleSignIn = async (payload: any) => {
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

const updateToken = async (refreshToken: string) => {
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
    data: { token: newRefreshToken, expiresAt },
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
    select:{
      id:true,
      email:true,
      role:true,
      isVerified:true
    }
    
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
export const AuthService = {
  signup,
  verifyEmail,
  signin,
  googleSignIn,
  updateToken,
  signOut,
  checkUser,
};
