/**
 * PM2 ecosystem config for CascadeSim y-websocket server.
 * Usage: pm2 start server/ecosystem.config.cjs
 */
'use strict'

module.exports = {
  apps: [
    {
      name: 'y-websocket',
      script: 'server/y-websocket.config.cjs',
      cwd: '/var/www/cascadesim',
      env: {
        PORT: 1234,
        MAX_CONNECTIONS: 50,
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
