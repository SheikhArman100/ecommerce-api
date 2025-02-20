import bcrypt from 'bcrypt';
import { Secret } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import passport from 'passport';
import { Strategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { prisma } from '../client';
import config from '../config';
import { jwtHelpers } from '../helpers/jwtHelpers';
import { parseExpirationTime } from '../utils';
import ApiError from '../errors/ApiError';
import status from 'http-status';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          throw new ApiError(status.NOT_FOUND, 'User does not exist');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          throw new ApiError(status.UNAUTHORIZED, 'Invalid email or pasword');
        }

        return done(null, user);
      } catch (error) {
        console.log(error);
        return done(error);
      }
    },
  ),
);

//google
passport.use(
  new Strategy(
    {
      clientID: `${config.google_client_id}`,
      clientSecret: `${config.google_client_secret}`,
      callbackURL: `${config.backend_url}/api/v1/auth/google/callback`,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(profile);
        const email = profile?.emails?.[0]?.value;
        if (!email) {
          throw new ApiError(status.NOT_FOUND, 'No Google info');
        }

        let user = await prisma.user.findUnique({
          where: { email },
          include: { detail: true },
        });
        let password;

        if (!user) {
          password = nanoid(6);
          const hashedPassword = await bcrypt.hash(
            password as string,
            Number(config.jwt.bcrypt_salt_rounds) || 10,
          );
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email,
              password: hashedPassword,
              isVerified: true,
              role: 'user',
              phoneNumber: '',
              detail: {
                create: {
                  image: profile.photos?.[0]?.value || '',
                  address: '',
                  city: '',
                  road: '',
                },
              },
            },
            include: {
              detail: true,
            },
          });
        }

        if (user) {
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
          return done(null, { user, password, accessToken, refreshToken });
        } else {
          throw new ApiError(status.INTERNAL_SERVER_ERROR, 'Server error');
        }
      } catch (error) {
        console.log(error);
        return done(error);
      }
    },
  ),
);

export default passport;
