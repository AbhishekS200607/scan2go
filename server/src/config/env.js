const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'scan2go_default_jwt_secret_2026_key',
  QR_SECRET: process.env.QR_SECRET || 'scan2go_default_qr_secret_2026_key',
  PAYMENT_SECRET: process.env.PAYMENT_SECRET || 'scan2go_payment_secret_key',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
};
