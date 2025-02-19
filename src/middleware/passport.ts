import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from 'bcrypt';
import { prisma } from "../client";

// Configure Passport Local Strategy for Signup
export default passport.use('signup', new LocalStrategy(
    { usernameField: 'email', passwordField: 'password', passReqToCallback: true }, 
    async (req, email, password, done) => {
      try {
        const { name, phoneNumber,role }  = req.body; 
        const hashedPassword = await bcrypt.hash(password, 10);

        const checkUser=await prisma.user.findUnique({where:{email:email,phoneNumber:phoneNumber}})
        if(!checkUser){
            return done(null, false, { message: "User already exists with this email or phone number." });
        }
  
        const user = await prisma.user.create({
          data: {
            name,
            email,
            phoneNumber,
            password: hashedPassword,
            role
          },
        });
  
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));