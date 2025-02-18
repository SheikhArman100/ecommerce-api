import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV,
  database_url: process.env.DATABASE_URL,
  port: process.env.PORT,
  admin_client_url: process.env.ADMIN_CLIENT_URL,
  jwt: {
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    access_secret: process.env.JWT_ACCESS_SECRET,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
    refresh_secret: process.env.JWT_REFRESH_SECRET,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
    forget_password_secret: process.env.JWT_FORGET_PASSWORD_SECRET,
    forget_password_expires_in: process.env.JWT_FORGET_PASSWORD_EXPIRES_IN,
  },
  softograph_email: process.env.SOFTOGRAPH_EMAIL,
  softograph_pass: process.env.SOFTOPGRAPH_PASS,
  rabbitMQ_url: process.env.RABBITMQ_URL,
  email_queue_name: process.env.EMAIL_QUEUE_NAME,
};
