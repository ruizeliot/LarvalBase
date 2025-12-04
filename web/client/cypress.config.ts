import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'https://ingevision.cloud/pipeline-gui-test/',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    video: false,
    screenshotOnRunFailure: true,
    env: {
      // Read from CYPRESS_DASHBOARD_PASSWORD env var, fallback to ecosystem.config.cjs value
      DASHBOARD_PASSWORD: process.env.CYPRESS_DASHBOARD_PASSWORD || 'ih7gx@o9NzyTR3eR'
    }
  },
})
