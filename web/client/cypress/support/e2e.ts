// Cypress E2E support file

// Custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(password?: string): Chainable<void>
      logout(): Chainable<void>
    }
  }
}

// Login helper - uses DASHBOARD_PASSWORD from Cypress env config
Cypress.Commands.add('login', (password?: string) => {
  const pw = password || Cypress.env('DASHBOARD_PASSWORD')
  cy.visit('/login')
  cy.get('[data-testid="password"]').type(pw)
  cy.intercept('POST', '**/api/auth').as('loginRequest')
  cy.get('[data-testid="submit"]').click()
  cy.wait('@loginRequest')
  cy.url().should('not.include', '/login')
})

// Logout helper
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="logout-button"]').click()
})

// Clear state before each test
beforeEach(() => {
  cy.clearLocalStorage()
})
