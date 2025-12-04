module.exports = {
  apps: [
    {
      name: 'pipeline-gui-backend-dev',
      script: 'npx',
      args: 'tsx server/src/index.ts',
      cwd: '/home/claude/IMT/Pipeline-Office/web',
      env: {
        PORT: 3025,
        NODE_ENV: 'development',
        DASHBOARD_PASSWORD: 'ih7gx@o9NzyTR3eR',
        JWT_SECRET: 'dev-jwt-secret-change-in-production'
      },
      watch: false,
      instances: 1
    },
    {
      name: 'pipeline-gui-frontend-dev',
      script: 'npx',
      args: 'vite --config vite.config.dev.ts',
      cwd: '/home/claude/IMT/Pipeline-Office/web/client',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      instances: 1
    }
  ]
}
