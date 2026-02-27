const dotenv = require('dotenv');
const path = require('path');

const env = process.env.NODE_ENV || 'development';

const envFile = `.env.${env}.local`;

dotenv.config({
  path: path.resolve(__dirname, `./${envFile}`)
});

module.exports = {
  PORT: process.env.PORT,
  SECRET_KEY: process.env.SECRET_KEY,
  MONGO_URI: process.env.MONGO_URI
};
