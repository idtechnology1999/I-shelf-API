const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from config folder
dotenv.config({ path: path.resolve(__dirname, '.env.development.local') });
dotenv.config({ path: path.resolve(__dirname, '.env.production.local') });

module.exports = {
  PORT: process.env.PORT,
  SECRET_KEY: process.env.SECRET_KEY || process.env.JWT_SECRET,
  JWT_SECRET: process.env.JWT_SECRET || process.env.SECRET_KEY,
  MONGO_URI: process.env.MONGO_URI,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY
};
