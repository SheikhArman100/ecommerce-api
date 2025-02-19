import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { prisma } from '../client';
import bcrypt from "bcrypt"


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
    }
  )
);

export default passport;
