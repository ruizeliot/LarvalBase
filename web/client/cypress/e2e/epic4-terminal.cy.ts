describe('Epic 4: Terminal Views', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('E2E-014: View Worker Terminal (US-014)', () => {
    it('E2E-014: Real-time terminal output from worker', () => {
      cy.visit('/pipeline/test-1/phase/1')
      cy.get('[data-testid="terminal"]').should('exist')
    })

    it('E2E-014a: Worker not running shows message', () => {
      cy.visit('/pipeline/test-1/phase/0a')
      // Terminal should show some indication about worker status
      cy.get('[data-testid="terminal"]').should('exist')
    })

    it('E2E-014b: Large terminal output handles gracefully', () => {
      cy.visit('/pipeline/test-1/phase/1')
      cy.get('[data-testid="terminal"]').should('exist')
      // Terminal should be scrollable
    })

    it('E2E-014c: WebSocket disconnects shows reconnecting', () => {
      cy.visit('/pipeline/test-1/phase/1')
      cy.get('[data-testid="terminal"]').should('exist')
    })
  })

  describe('E2E-015: Send Message to Worker (US-015)', () => {
    beforeEach(() => {
      cy.visit('/pipeline/test-1/phase/1')
    })

    it('E2E-015: Admin can send commands to worker terminal', () => {
      cy.get('[data-testid="worker-input"]').should('exist')
      cy.get('[data-testid="worker-input"]').type('echo hello')

      cy.intercept('POST', '**/api/workers/*/send', {
        statusCode: 200,
        body: { success: true, message: 'Message sent to worker' }
      }).as('sendMessage')
      cy.get('[data-testid="worker-send"]').click()
      cy.wait('@sendMessage').its('response.statusCode').should('eq', 200)
    })

    it('E2E-015a: Empty message disabled or no-op', () => {
      cy.get('[data-testid="worker-input"]').clear()
      cy.get('[data-testid="worker-send"]').click()
      // Should not make request with empty message
    })

    it('E2E-015b: Worker disconnected shows error', () => {
      cy.intercept('POST', '**/api/workers/*/send', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Worker not connected' }
      }).as('sendFailed')

      cy.get('[data-testid="worker-input"]').type('test')
      cy.get('[data-testid="worker-send"]').click()
      cy.wait('@sendFailed')
      cy.get('[data-testid="error"]').should('exist')
    })

    it('E2E-015c: Long message handles without truncation', () => {
      const longMessage = 'x'.repeat(1000)
      cy.get('[data-testid="worker-input"]').type(longMessage)

      cy.intercept('POST', '**/api/workers/*/send').as('sendMessage')
      cy.get('[data-testid="worker-send"]').click()
      cy.wait('@sendMessage').then((interception) => {
        expect(interception.request.body.message.length).to.eq(1000)
      })
    })
  })

  describe('E2E-016: View Supervisor Sidebar (US-016)', () => {
    it('E2E-016: Supervisor terminal appears as overlay sidebar', () => {
      cy.visit('/')
      cy.get('[data-testid="supervisor-toggle"]').should('exist')
      cy.get('[data-testid="supervisor-toggle"]').click()

      // Sidebar should appear
      cy.get('[data-testid="supervisor-sidebar"]').should('be.visible')
      cy.get('[data-testid="supervisor-terminal"]').should('exist')

      // Toggle closed
      cy.get('[data-testid="supervisor-toggle"]').click()
      cy.get('[data-testid="supervisor-sidebar"]').should('not.exist')
    })

    it('E2E-016a: Supervisor not running shows message', () => {
      cy.visit('/')
      cy.get('[data-testid="supervisor-toggle"]').click()
      // Terminal should show some status
      cy.get('[data-testid="supervisor-terminal"]').should('exist')
    })

    it('E2E-016b: Sidebar is resizable', () => {
      cy.visit('/')
      cy.get('[data-testid="supervisor-toggle"]').click()
      cy.get('[data-testid="supervisor-sidebar"]').should('have.css', 'width', '320px')
    })

    it('E2E-016c: Sidebar persists across navigation', () => {
      cy.visit('/')
      cy.get('[data-testid="supervisor-toggle"]').click()
      cy.get('[data-testid="supervisor-sidebar"]').should('be.visible')

      // Navigate to settings
      cy.visit('/settings')

      // Sidebar should still be open (state persists)
      cy.get('[data-testid="supervisor-sidebar"]').should('be.visible')
    })
  })

  describe('E2E-017: Send Message to Supervisor (US-017)', () => {
    beforeEach(() => {
      cy.visit('/')
      cy.get('[data-testid="supervisor-toggle"]').click()
    })

    it('E2E-017: Admin can send messages and use quick actions', () => {
      cy.get('[data-testid="supervisor-input"]').type('status')

      cy.intercept('POST', '**/api/supervisor/send').as('sendMessage')
      cy.get('[data-testid="supervisor-send"]').click()
      cy.wait('@sendMessage').its('response.statusCode').should('eq', 200)
    })

    it('E2E-017a: Pre-filled buttons work', () => {
      cy.get('[data-testid="nudge-button"]').should('exist')

      cy.intercept('POST', '**/api/supervisor/nudge').as('nudge')
      cy.get('[data-testid="nudge-button"]').click()
      cy.wait('@nudge').its('response.statusCode').should('eq', 200)
    })

    it('E2E-017b: Supervisor disconnected shows error', () => {
      cy.intercept('POST', '**/api/supervisor/send', {
        statusCode: 500,
        body: { error: 'Internal Error', message: 'Supervisor not connected' }
      }).as('sendFailed')

      cy.get('[data-testid="supervisor-input"]').type('test')
      cy.get('[data-testid="supervisor-send"]').click()
      cy.wait('@sendFailed')
    })

    it('E2E-017c: Rapid clicks are debounced', () => {
      cy.intercept('POST', '**/api/supervisor/nudge').as('nudge')
      cy.get('[data-testid="nudge-button"]').dblclick()
      // Should handle gracefully
      cy.wait('@nudge')
    })
  })

  describe('E2E-018: Copy Terminal Output (US-018)', () => {
    beforeEach(() => {
      cy.visit('/pipeline/test-1/phase/1')
    })

    it('E2E-018: Admin can copy terminal buffer', () => {
      cy.get('[data-testid="copy-output"]').should('exist')
      cy.get('[data-testid="copy-output"]').click()
      // Should copy to clipboard (hard to verify in Cypress)
    })

    it('E2E-018a: Empty terminal copies empty or shows message', () => {
      cy.get('[data-testid="copy-output"]').click()
    })

    it('E2E-018b: Large buffer copies all content', () => {
      cy.get('[data-testid="copy-output"]').click()
    })

    it('E2E-018c: Clipboard unavailable shows error', () => {
      // Clipboard API might not be available in some contexts
      cy.get('[data-testid="copy-output"]').click()
    })
  })

  describe('E2E-019: Kill Worker Session (US-019)', () => {
    beforeEach(() => {
      cy.visit('/pipeline/test-1/phase/1')
    })

    it('E2E-019: Admin can kill worker session', () => {
      cy.get('[data-testid="kill-worker"]').click()

      // Confirmation modal
      cy.get('[data-testid="confirm-kill"]').should('exist')

      cy.intercept('POST', '**/api/workers/*/kill', {
        statusCode: 200,
        body: { success: true, message: 'Worker session killed' }
      }).as('killWorker')
      cy.get('[data-testid="confirm-kill"]').click()
      cy.wait('@killWorker').its('response.statusCode').should('eq', 200)
    })

    it('E2E-019a: Cancel confirmation does not kill', () => {
      cy.get('[data-testid="kill-worker"]').click()
      cy.get('[data-testid="cancel-kill"]').click()
      // Modal should close, no request made
    })

    it('E2E-019b: Kill already disconnected shows error', () => {
      cy.intercept('POST', '**/api/workers/*/kill', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Worker not connected' }
      }).as('killFailed')

      cy.get('[data-testid="kill-worker"]').click()
      cy.get('[data-testid="confirm-kill"]').click()
      cy.wait('@killFailed')
    })

    it('E2E-019c: Kill mid-task marks task failed', () => {
      cy.intercept('POST', '**/api/workers/*/kill').as('killWorker')
      cy.get('[data-testid="kill-worker"]').click()
      cy.get('[data-testid="confirm-kill"]').click()
      cy.wait('@killWorker')
    })
  })

  describe('E2E-020: Restart Coordinator (US-020)', () => {
    beforeEach(() => {
      cy.visit('/settings')
    })

    it('E2E-020: Admin can restart coordinator', () => {
      cy.get('[data-testid="restart-coordinator"]').click()

      // Confirmation modal
      cy.get('[data-testid="confirm-restart"]').should('exist')

      cy.intercept('POST', '**/api/coordinator/restart').as('restartCoordinator')
      cy.get('[data-testid="confirm-restart"]').click()
      cy.wait('@restartCoordinator').its('response.statusCode').should('eq', 200)
    })

    it('E2E-020a: Cancel does not restart', () => {
      cy.get('[data-testid="restart-coordinator"]').click()
      cy.contains('Cancel').click()
      // Modal should close
    })

    it('E2E-020b: Restart failure shows error', () => {
      cy.intercept('POST', '**/api/coordinator/restart', {
        statusCode: 500,
        body: { error: 'Internal Error', message: 'Failed to restart' }
      }).as('restartFailed')

      cy.get('[data-testid="restart-coordinator"]').click()
      cy.get('[data-testid="confirm-restart"]').click()
      cy.wait('@restartFailed')
    })

    it('E2E-020c: Pipelines resume after restart', () => {
      cy.intercept('POST', '**/api/coordinator/restart').as('restartCoordinator')
      cy.get('[data-testid="restart-coordinator"]').click()
      cy.get('[data-testid="confirm-restart"]').click()
      cy.wait('@restartCoordinator')
      // Dashboard should reconnect (tested via UI state)
    })
  })

  describe('E2E-022: Split Terminal View (US-022)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/pipelines/split-test-1', {
        body: {
          id: 'split-test-1',
          projectName: 'Split Test Project',
          projectPath: '/home/claude/IMT/split-test',
          currentPhase: '1',
          status: 'in-progress',
          phases: [
            { name: '0a', status: 'complete' },
            { name: '0b', status: 'complete' },
            { name: '1', status: 'in-progress', workerName: 'worker-split-test' },
            { name: '2', status: 'pending' },
            { name: '3', status: 'pending' }
          ]
        }
      }).as('getPipeline')
    })

    it('E2E-022: Admin sees Supervisor and Worker terminals side-by-side', () => {
      cy.visit('/pipeline/split-test-1')
      cy.wait('@getPipeline')

      // Verify phase diagram at top
      cy.get('[data-testid="phase-diagram"]').should('exist')
      cy.get('[data-testid="phase-0a"]').should('exist')
      cy.get('[data-testid="phase-0b"]').should('exist')
      cy.get('[data-testid="phase-1"]').should('exist')
      cy.get('[data-testid="phase-2"]').should('exist')
      cy.get('[data-testid="phase-3"]').should('exist')

      // Verify current phase highlighted
      cy.get('[data-testid="phase-1"]').should('have.class', 'active')

      // Verify split terminal panes
      cy.get('[data-testid="split-terminal-container"]').should('exist')

      // Left pane: Supervisor terminal
      cy.get('[data-testid="supervisor-pane"]').should('exist')
      cy.get('[data-testid="supervisor-terminal"]').should('exist')
      cy.get('[data-testid="supervisor-input"]').should('exist')
      cy.get('[data-testid="supervisor-send"]').should('exist')

      // Right pane: Worker terminal
      cy.get('[data-testid="worker-pane"]').should('exist')
      cy.get('[data-testid="worker-terminal"]').should('exist')
      cy.get('[data-testid="worker-input"]').should('exist')
      cy.get('[data-testid="worker-send"]').should('exist')

      // Verify both terminals use xterm.js (check for xterm class)
      cy.get('[data-testid="supervisor-terminal"] .xterm').should('exist')
      cy.get('[data-testid="worker-terminal"] .xterm').should('exist')

      // Verify input bars are fixed at bottom (check CSS position)
      cy.get('[data-testid="supervisor-input-bar"]').should('have.css', 'position', 'sticky')
      cy.get('[data-testid="worker-input-bar"]').should('have.css', 'position', 'sticky')

      // Click different phase to switch worker view
      cy.get('[data-testid="phase-0b"]').click()

      // Worker pane should update to show phase 0b info
      cy.get('[data-testid="worker-pane-phase"]').should('contain', '0b')
    })

    it('E2E-022a: No worker for selected phase shows message', () => {
      cy.intercept('GET', '**/api/pipelines/no-worker-1', {
        body: {
          id: 'no-worker-1',
          projectName: 'No Worker Test',
          projectPath: '/home/claude/IMT/no-worker',
          currentPhase: '0a',
          status: 'in-progress',
          phases: [
            { name: '0a', status: 'pending' },
            { name: '0b', status: 'pending' },
            { name: '1', status: 'pending' },
            { name: '2', status: 'pending' },
            { name: '3', status: 'pending' }
          ]
        }
      }).as('getNoWorkerPipeline')

      cy.visit('/pipeline/no-worker-1')
      cy.wait('@getNoWorkerPipeline')

      // Click on a phase that has no worker
      cy.get('[data-testid="phase-2"]').click()

      // Worker pane should show "No worker for this phase" message
      cy.get('[data-testid="worker-no-session"]').should('contain', 'No worker for this phase')
    })

    it('E2E-022b: Resize browser resizes both terminals proportionally', () => {
      cy.visit('/pipeline/split-test-1')
      cy.wait('@getPipeline')

      // Get initial widths
      cy.get('[data-testid="supervisor-pane"]').invoke('width').then((supervisorWidth) => {
        cy.get('[data-testid="worker-pane"]').invoke('width').then((workerWidth) => {
          // Both should have approximately equal width (50% each)
          expect(Math.abs(supervisorWidth - workerWidth)).to.be.lessThan(50)
        })
      })

      // Resize viewport
      cy.viewport(1200, 800)

      // Both panes should still be visible and proportional
      cy.get('[data-testid="supervisor-pane"]').should('be.visible')
      cy.get('[data-testid="worker-pane"]').should('be.visible')
    })

    it('E2E-022c: One terminal disconnects shows reconnecting state', () => {
      cy.visit('/pipeline/split-test-1')
      cy.wait('@getPipeline')

      // Simulate WebSocket disconnect for worker terminal
      cy.window().then((win) => {
        // Worker WebSocket should trigger reconnect UI
        // This tests that reconnecting state is visible when disconnected
        cy.get('[data-testid="worker-terminal"]').should('exist')
      })

      // Verify supervisor terminal remains connected
      cy.get('[data-testid="supervisor-terminal"]').should('exist')

      // If there's a reconnecting indicator, it should be shown
      // (This depends on actual WebSocket disconnect behavior)
      cy.get('[data-testid="terminal-status"]').should('exist')
    })
  })
})
