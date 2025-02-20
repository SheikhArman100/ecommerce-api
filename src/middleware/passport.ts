import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy } from 'passport-google-oauth20';
import { prisma } from '../client';
import bcrypt from 'bcrypt';
import config from '../config';
import { jwtHelpers } from '../helpers/jwtHelpers';
import { parseExpirationTime } from '../utils';
import { Secret } from 'jsonwebtoken';

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
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
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
        const email = profile?.emails?.[0]?.value;
        if (!email) return done(null, false, { message: 'No Google info' });

        let user = await prisma.user.findUnique({
          where: { email },
          include: { detail: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email,
              password: '',
              isVerified: true,
              role: 'user',
              phoneNumber: '', // Add a default or empty phone number
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
          return done(null, { user, accessToken, refreshToken });
        } else {
          return done(null, false, { message: 'User creation failed' });
        }
      } catch (error) {
        return done(error);
      }
    },
  ),
);

export default passport;
