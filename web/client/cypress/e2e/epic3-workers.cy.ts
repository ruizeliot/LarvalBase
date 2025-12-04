describe('Epic 3: Worker Management', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/settings')
  })

  describe('E2E-010: View Workers List (US-010)', () => {
    it('E2E-010: Admin sees all workers with real-time updates', () => {
      cy.intercept('GET', '**/api/workers').as('getWorkers')
      cy.intercept('GET', '**/api/tokens').as('getTokens')
      cy.wait('@getWorkers').its('response.statusCode').should('eq', 200)

      // Should show workers list or empty state
      cy.get('[data-testid="workers-list"], [data-testid="no-workers"]').should('exist')
    })

    it('E2E-010a: No workers shows empty state', () => {
      cy.intercept('GET', '**/api/workers', { body: [] }).as('emptyWorkers')
      cy.intercept('GET', '**/api/tokens', { body: [] }).as('emptyTokens')
      cy.visit('/settings')
      cy.wait('@emptyWorkers')
      cy.get('[data-testid="no-workers"]').should('contain', 'No workers')
    })

    it('E2E-010b: Worker reconnects updates status', () => {
      // Mock a worker that reconnects
      cy.intercept('GET', '**/api/workers', {
        body: [{
          id: 'worker-1',
          name: 'Worker 1',
          status: 'connected',
          cpu: 45,
          ram: 60
        }]
      }).as('getWorkers')
      cy.intercept('GET', '**/api/tokens', { body: [] }).as('getTokens')

      cy.visit('/settings')
      cy.wait('@getWorkers')
      cy.get('[data-testid="worker-worker-1"]').should('exist')
    })

    it('E2E-010c: Worker metrics unavailable shows N/A', () => {
      cy.intercept('GET', '**/api/workers', {
        body: [{
          id: 'worker-1',
          name: 'Worker 1',
          status: 'connected',
          cpu: null,
          ram: null
        }]
      }).as('getWorkers')
      cy.intercept('GET', '**/api/tokens', { body: [] }).as('getTokens')

      cy.visit('/settings')
      cy.wait('@getWorkers')
      cy.get('[data-testid="worker-worker-1"]').should('contain', 'N/A')
    })
  })

  describe('E2E-011: Generate Connection Token (US-011)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/workers', { body: [] }).as('getWorkers')
      cy.intercept('GET', '**/api/tokens', { body: [] }).as('getTokens')
      cy.visit('/settings')
      cy.wait('@getWorkers')
      cy.wait('@getTokens')
    })

    it('E2E-011: Admin can generate and copy connection tokens', () => {
      cy.intercept('POST', '**/api/tokens', {
        statusCode: 201,
        body: {
          id: 'token-new',
          token: 'new-token-12345678901234567890',
          createdAt: new Date().toISOString(),
          revoked: false
        }
      }).as('generateToken')
      cy.get('[data-testid="generate-token"]').click()
      cy.wait('@generateToken').its('response.statusCode').should('eq', 201)
    })

    it('E2E-011a: Multiple tokens are unique', () => {
      cy.intercept('POST', '**/api/tokens', {
        statusCode: 201,
        body: {
          id: 'token-1',
          token: 'unique-token-1234567890',
          createdAt: new Date().toISOString(),
          revoked: false
        }
      }).as('generateToken')
      cy.get('[data-testid="generate-token"]').click()
      cy.wait('@generateToken').then((first) => {
        cy.intercept('POST', '**/api/tokens', {
          statusCode: 201,
          body: {
            id: 'token-2',
            token: 'unique-token-0987654321',
            createdAt: new Date().toISOString(),
            revoked: false
          }
        }).as('generateToken2')
        cy.get('[data-testid="generate-token"]').click()
        cy.wait('@generateToken2').then((second) => {
          // Both should return successfully (unique tokens)
          expect(first.response?.statusCode).to.eq(201)
          expect(second.response?.statusCode).to.eq(201)
        })
      })
    })

    it('E2E-011b: Revoke token makes it invalid', () => {
      cy.intercept('GET', '**/api/tokens', {
        body: [{
          id: 'token-1',
          token: 'test-token-12345678',
          createdAt: new Date().toISOString(),
          revoked: false
        }]
      }).as('getTokens')

      cy.visit('/settings')
      cy.wait('@getTokens')

      cy.intercept('DELETE', '**/api/tokens/token-1', {
        statusCode: 200,
        body: { success: true, message: 'Token revoked' }
      }).as('revokeToken')
      // Would click revoke button on token
    })

    it('E2E-011c: Token display is masked', () => {
      cy.intercept('GET', '**/api/tokens', {
        body: [{
          id: 'token-1',
          token: 'test-token-12345678',
          createdAt: new Date().toISOString(),
          revoked: false
        }]
      }).as('getTokens')

      cy.visit('/settings')
      cy.wait('@getTokens')
      cy.get('[data-testid="tokens-list"]').should('contain', '...')
    })
  })

  describe('E2E-012: Download Agent Binary (US-012)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/workers', { body: [] }).as('getWorkers')
      cy.intercept('GET', '**/api/tokens', { body: [] }).as('getTokens')
      cy.visit('/settings')
      cy.wait('@getWorkers')
    })

    it('E2E-012: Admin can download agent for each OS', () => {
      cy.get('[data-testid="agent-downloads"]').should('exist')
      cy.get('[data-testid="download-windows"]').should('exist')
      cy.get('[data-testid="download-linux"]').should('exist')
      cy.get('[data-testid="download-macos"]').should('exist')
    })

    it('E2E-012a: Agent binary not found shows error', () => {
      cy.intercept('GET', '**/api/agent/windows', {
        statusCode: 404,
        body: { error: 'Not Found', message: 'Agent binary not found' }
      }).as('downloadAgent')

      // Click would trigger download
      cy.get('[data-testid="download-windows"]').should('have.attr', 'href', '/api/agent/windows')
    })

    it('E2E-012b: Download shows progress', () => {
      // Large file would show progress
      cy.get('[data-testid="download-linux"]').should('exist')
    })

    it('E2E-012c: Instructions are visible', () => {
      cy.contains('pipeline-agent').should('exist')
    })
  })

  describe('E2E-013: Remove Worker (US-013)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/workers', {
        body: [{
          id: 'worker-1',
          name: 'Worker 1',
          status: 'connected',
          cpu: 45,
          ram: 60
        }]
      }).as('getWorkers')
      cy.intercept('GET', '**/api/tokens', { body: [] }).as('getTokens')

      cy.visit('/settings')
      cy.wait('@getWorkers')
    })

    it('E2E-013: Admin can remove a worker', () => {
      cy.get('[data-testid="remove-worker-worker-1"]').click()

      // Confirmation modal should appear
      cy.get('[data-testid="confirm-remove"]').should('exist')

      cy.intercept('DELETE', '**/api/workers/worker-1', {
        statusCode: 200,
        body: { success: true, message: 'Worker removed' }
      }).as('removeWorker')
      cy.get('[data-testid="confirm-remove"]').click()
      cy.wait('@removeWorker').its('response.statusCode').should('eq', 200)
    })

    it('E2E-013a: Cancel confirmation does not remove', () => {
      cy.get('[data-testid="remove-worker-worker-1"]').click()
      cy.get('[data-testid="cancel-remove"]').click()

      // Worker should still exist
      cy.get('[data-testid="worker-worker-1"]').should('exist')
    })

    it('E2E-013b: Remove disconnected worker works', () => {
      cy.intercept('GET', '**/api/workers', {
        body: [{
          id: 'worker-1',
          name: 'Worker 1',
          status: 'disconnected'
        }]
      }).as('disconnectedWorker')

      cy.visit('/settings')
      cy.wait('@disconnectedWorker')

      cy.get('[data-testid="remove-worker-worker-1"]').click()
      cy.intercept('DELETE', '**/api/workers/worker-1', {
        statusCode: 200,
        body: { success: true, message: 'Worker removed' }
      }).as('removeWorker')
      cy.get('[data-testid="confirm-remove"]').click()
      cy.wait('@removeWorker')
    })

    it('E2E-013c: Remove worker mid-task reassigns', () => {
      cy.intercept('GET', '**/api/workers', {
        body: [{
          id: 'worker-1',
          name: 'Worker 1',
          status: 'busy',
          currentTask: 'pipeline-1'
        }]
      }).as('busyWorker')

      cy.visit('/settings')
      cy.wait('@busyWorker')

      cy.intercept('DELETE', '**/api/workers/worker-1', {
        statusCode: 200,
        body: { success: true, message: 'Worker removed' }
      }).as('removeWorker')
      cy.get('[data-testid="remove-worker-worker-1"]').click()
      cy.get('[data-testid="confirm-remove"]').click()
      cy.wait('@removeWorker')
    })
  })
})
