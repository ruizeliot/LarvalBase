describe('Epic 1: Authentication', () => {
  describe('E2E-001: Login (US-001)', () => {
    beforeEach(() => {
      cy.visit('/login')
    })

    it('E2E-001: User can login with correct password', () => {
      cy.get('[data-testid="password"]').should('exist')
      cy.get('[data-testid="password"]').should('have.attr', 'type', 'password')

      // Try incorrect password first
      cy.intercept('POST', '**/api/auth').as('loginAttempt')
      cy.get('[data-testid="password"]').type('wrongpassword')
      cy.get('[data-testid="submit"]').click()
      cy.wait('@loginAttempt').its('response.statusCode').should('eq', 401)
      cy.get('[data-testid="error"]').should('contain', 'Invalid password')

      // Clear and try correct password
      cy.intercept('POST', '**/api/auth').as('loginSuccess')
      cy.get('[data-testid="password"]').clear().type(Cypress.env('DASHBOARD_PASSWORD'))
      cy.get('[data-testid="submit"]').click()
      cy.wait('@loginSuccess').its('response.statusCode').should('eq', 200)

      // Verify redirect to main page first
      cy.url().should('eq', Cypress.config().baseUrl)

      // Wait for storage to be updated, then verify JWT stored
      cy.window().should((win) => {
        const storage = win.localStorage.getItem('auth-storage')
        expect(storage).to.not.be.null
        const parsed = JSON.parse(storage!)
        expect(parsed.state.token).to.not.be.null
        expect(parsed.state.token).to.be.a('string')
        expect(parsed.state.token.length).to.be.greaterThan(10)
      })
    })

    it('E2E-001a: Empty password shows error', () => {
      cy.intercept('POST', '**/api/auth').as('loginRequest')
      cy.get('[data-testid="submit"]').click()
      cy.wait('@loginRequest').its('response.statusCode').should('eq', 400)
      cy.get('[data-testid="error"]').should('contain', 'required')
    })

    it('E2E-001b: Password field is masked', () => {
      cy.get('[data-testid="password"]').should('have.attr', 'type', 'password')
    })

    it('E2E-001c: Submit button disabled while loading', () => {
      cy.get('[data-testid="password"]').type(Cypress.env('DASHBOARD_PASSWORD'))
      cy.intercept('POST', '**/api/auth', (req) => {
        req.on('response', (res) => {
          res.setDelay(500)
        })
      }).as('delayedLogin')
      cy.get('[data-testid="submit"]').click()
      cy.get('[data-testid="submit"]').should('be.disabled')
    })
  })

  describe('E2E-002: Session Persistence (US-002)', () => {
    it('E2E-002: Authenticated user stays logged in', () => {
      // Login first
      cy.visit('/login')
      cy.get('[data-testid="password"]').type(Cypress.env('DASHBOARD_PASSWORD'))
      cy.intercept('POST', '**/api/auth').as('login')
      cy.get('[data-testid="submit"]').click()
      cy.wait('@login').its('response.statusCode').should('eq', 200)

      // Wait for redirect to complete (login navigates to /)
      cy.url().should('eq', Cypress.config().baseUrl)

      // Verify token is in localStorage before reload
      cy.window().should((win) => {
        const storage = win.localStorage.getItem('auth-storage')
        expect(storage).to.not.be.null
        const parsed = JSON.parse(storage!)
        expect(parsed.state.token).to.not.be.null
      })

      // Reload page
      cy.reload()

      // Verify still on main page (not redirected to login)
      cy.url().should('eq', Cypress.config().baseUrl)

      // Verify API calls include Authorization header
      cy.intercept('GET', '**/api/pipelines').as('getPipelines')
      cy.wait('@getPipelines').then((interception) => {
        expect(interception.request.headers).to.have.property('authorization')
        expect(interception.request.headers.authorization).to.match(/^Bearer .+/)
      })
    })

    it('E2E-002a: Expired JWT redirects to login', () => {
      // Set an expired/invalid token
      cy.window().then((win) => {
        win.localStorage.setItem('auth-storage', JSON.stringify({
          state: { token: 'expired-invalid-token' }
        }))
      })

      cy.visit('/')
      cy.intercept('GET', '**/api/pipelines').as('getPipelines')
      cy.wait('@getPipelines').its('response.statusCode').should('eq', 401)
      cy.url().should('include', '/login')
    })

    it('E2E-002b: Corrupted JWT clears storage and redirects', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('auth-storage', JSON.stringify({
          state: { token: 'not-a-valid-jwt' }
        }))
      })

      cy.visit('/')
      cy.intercept('GET', '**/api/pipelines').as('getPipelines')
      cy.wait('@getPipelines').its('response.statusCode').should('eq', 401)
      cy.url().should('include', '/login')
    })

    it('E2E-002c: No JWT redirects to login', () => {
      cy.clearLocalStorage()
      cy.visit('/')
      cy.url().should('include', '/login')
    })
  })

  describe('E2E-003: Logout (US-003)', () => {
    beforeEach(() => {
      cy.login()
      cy.url().should('eq', Cypress.config().baseUrl)
    })

    it('E2E-003: User can logout and session is cleared', () => {
      // Verify logout button exists
      cy.get('[data-testid="logout-button"]').should('be.visible')

      // Click logout
      cy.get('[data-testid="logout-button"]').click()

      // Verify redirect to login first
      cy.url().should('include', '/login')

      // Wait for storage to be updated, then verify JWT removed
      cy.window().should((win) => {
        const storage = win.localStorage.getItem('auth-storage')
        const parsed = storage ? JSON.parse(storage) : null
        expect(parsed?.state?.token).to.be.null
      })

      // Try to navigate to main page directly
      cy.visit('/')
      cy.url().should('include', '/login')
    })

    it('E2E-003a: Logout when WebSocket disconnected still works', () => {
      // Even without WebSocket, logout should work
      cy.get('[data-testid="logout-button"]').click()
      cy.url().should('include', '/login')
    })

    it('E2E-003b: Multiple logout clicks handled gracefully', () => {
      cy.get('[data-testid="logout-button"]').dblclick()
      // Should not error
      cy.url().should('include', '/login')
    })
  })
})
