const dotenv = require('dotenv');
const path = require('path');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production.local'
  : '.env.development.local';

dotenv.config({ path: path.resolve(__dirname, envFile) });

module.exports = {
  PORT: process.env.PORT,
  SECRET_KEY: process.env.SECRET_KEY || process.env.JWT_SECRET,
  JWT_SECRET: process.env.JWT_SECRET || process.env.SECRET_KEY,
  MONGO_URI: process.env.MONGO_URI,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY
};
