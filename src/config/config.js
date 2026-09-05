'use strict';

require('dotenv').config({ quiet: true });

const config = {
  app: {
    name: process.env.APP_NAME || 'WhatsApp Bot',
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true'
  },

  paths: {
    base:
      process.env.BOT_BASE_DIR || '/app',

    runtime:
      process.env.BOT_RUNTIME_DIR || '/data',

    auth:
      process.env.BOT_AUTH_DIR ||
      '/data/whatsapp-auth',

    tessdata:
      process.env.BOT_TESSDATA_DIR ||
      '/app/tessdata'
  },

  timezone:
    process.env.BOT_TIMEZONE || 'Asia/Kolkata',

  chromium: {
    executable:
      process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium-browser'
  }
};

module.exports = config;
