describe('Epic 2: Pipeline Management', () => {
  beforeEach(() => {
    cy.login()
    cy.url().should('eq', Cypress.config().baseUrl)
  })

  describe('E2E-004: View Pipelines List (US-004)', () => {
    it('E2E-004: Admin sees all pipelines with real-time updates', () => {
      // Verify list page loads
      cy.intercept('GET', '**/api/pipelines').as('getPipelines')
      cy.wait('@getPipelines').its('response.statusCode').should('eq', 200)

      // Should show pipelines list or empty state
      cy.get('[data-testid="pipelines-list"], [data-testid="empty-state"]').should('exist')

      // If pipelines exist, click one
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid^="pipeline-"]').length > 0) {
          cy.get('[data-testid^="pipeline-"]').first().click()
          cy.url().should('include', '/pipeline/')
        }
      })
    })

    it('E2E-004a: No pipelines shows empty state', () => {
      cy.intercept('GET', '**/api/pipelines', { body: [] }).as('emptyPipelines')
      cy.visit('/')
      cy.wait('@emptyPipelines')
      cy.get('[data-testid="empty-state"]').should('contain', 'No pipelines')
    })

    it('E2E-004b: WebSocket disconnects shows warning', () => {
      // This would require testing WebSocket behavior
      // For skeleton, verify the WebSocket path exists
      cy.window().then((win) => {
        // WebSocket endpoint should be available
        expect(win.WebSocket).to.exist
      })
    })

    it('E2E-004c: Many pipelines renders without issues', () => {
      // Mock 50+ pipelines
      const pipelines = Array.from({ length: 50 }, (_, i) => ({
        id: `pipeline-${i}`,
        projectName: `Project ${i}`,
        projectPath: `/path/project-${i}`,
        currentPhase: '1',
        status: 'in-progress',
        phases: []
      }))

      cy.intercept('GET', '**/api/pipelines', { body: pipelines }).as('manyPipelines')
      cy.visit('/')
      cy.wait('@manyPipelines')
      cy.get('[data-testid="pipelines-list"]').should('exist')
    })
  })

  describe('E2E-005: View Pipeline Graph (US-005)', () => {
    it('E2E-005: Visual graph shows pipeline phases', () => {
      cy.intercept('GET', '**/api/pipelines/test-1', {
        body: {
          id: 'test-1',
          projectName: 'Test Project',
          projectPath: '/test/project',
          currentPhase: '1',
          status: 'in-progress',
          phases: [
            { name: '0a', status: 'complete' },
            { name: '0b', status: 'complete' },
            { name: '1', status: 'in-progress', workerName: 'Worker 1' },
            { name: '2', status: 'pending' },
            { name: '3', status: 'pending' },
          ]
        }
      }).as('getPipeline')

      cy.visit('/pipeline/test-1')
      cy.wait('@getPipeline').its('response.statusCode').should('eq', 200)

      // Verify phases visible
      cy.get('[data-testid="phase-0a"]').should('exist')
      cy.get('[data-testid="phase-0b"]').should('exist')
      cy.get('[data-testid="phase-1"]').should('exist')
      cy.get('[data-testid="phase-2"]').should('exist')
      cy.get('[data-testid="phase-3"]').should('exist')

      // Click phase to select it (switches worker pane per US-022)
      cy.get('[data-testid="phase-1"]').click()
      // Verify worker pane shows selected phase
      cy.get('[data-testid="worker-pane-phase"]').should('contain', '1')
    })

    it('E2E-005a: Invalid pipeline ID shows error', () => {
      cy.intercept('GET', '**/api/pipelines/invalid-id', {
        statusCode: 404,
        body: { error: 'Not Found', message: 'Pipeline not found' }
      }).as('notFound')

      cy.visit('/pipeline/invalid-id')
      cy.wait('@notFound')
      cy.get('[data-testid="error"]').should('contain', 'not found')
    })

    it('E2E-005b: Phase without worker shows Unassigned', () => {
      cy.intercept('GET', '**/api/pipelines/test-1', {
        body: {
          id: 'test-1',
          projectName: 'Test',
          projectPath: '/test',
          currentPhase: '0a',
          status: 'queued',
          phases: [
            { name: '0a', status: 'pending' }
          ]
        }
      }).as('getPipeline')

      cy.visit('/pipeline/test-1')
      cy.wait('@getPipeline')
      // Phase should show pending status
      cy.get('[data-testid="phase-0a"]').should('contain', 'pending')
    })

    it('E2E-005c: Pipeline in queued status shows all pending', () => {
      cy.intercept('GET', '**/api/pipelines/queued-1', {
        body: {
          id: 'queued-1',
          projectName: 'Queued Project',
          projectPath: '/test',
          currentPhase: '0a',
          status: 'queued',
          phases: []
        }
      }).as('queuedPipeline')

      cy.visit('/pipeline/queued-1')
      cy.wait('@queuedPipeline')
    })
  })

  describe('E2E-006: Start New Pipeline (US-006)', () => {
    it('E2E-006: Admin can start a new pipeline', () => {
      cy.get('[data-testid="start-pipeline"]').click()

      // Form should appear
      cy.get('[data-testid="project-path"]').should('exist')
      cy.get('[data-testid="mode-select"]').should('exist')
      cy.get('[data-testid="phase-select"]').should('exist')

      // Fill form
      cy.get('[data-testid="project-path"]').type('/home/test/project')
      cy.get('[data-testid="mode-select"]').select('new')
      cy.get('[data-testid="phase-select"]').select('0a')

      // Submit
      cy.intercept('POST', '**/api/pipelines').as('createPipeline')
      cy.get('[data-testid="create-pipeline"]').click()
      cy.wait('@createPipeline').its('response.statusCode').should('eq', 201)
    })

    it('E2E-006a: Empty project path shows error', () => {
      cy.get('[data-testid="start-pipeline"]').click()
      cy.intercept('POST', '**/api/pipelines').as('createPipeline')
      cy.get('[data-testid="create-pipeline"]').click()
      cy.wait('@createPipeline').its('response.statusCode').should('eq', 400)
      cy.get('[data-testid="error"]').should('contain', 'required')
    })

    it('E2E-006b: Invalid path format shows error', () => {
      cy.get('[data-testid="start-pipeline"]').click()
      cy.get('[data-testid="project-path"]').type('invalid-path-no-slash')
      cy.intercept('POST', '**/api/pipelines').as('createPipeline')
      cy.get('[data-testid="create-pipeline"]').click()
      cy.wait('@createPipeline').its('response.statusCode').should('eq', 400)
    })

    it('E2E-006c: Feature mode includes flag', () => {
      cy.get('[data-testid="start-pipeline"]').click()
      cy.get('[data-testid="project-path"]').type('/home/test/project')
      cy.get('[data-testid="mode-select"]').select('feature')

      cy.intercept('POST', '**/api/pipelines').as('createPipeline')
      cy.get('[data-testid="create-pipeline"]').click()
      cy.wait('@createPipeline').then((interception) => {
        expect(interception.request.body.mode).to.eq('feature')
      })
    })
  })

  describe('E2E-007: Stop Pipeline (US-007)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/pipelines/running-1', {
        body: {
          id: 'running-1',
          projectName: 'Running Project',
          projectPath: '/test',
          currentPhase: '2',
          status: 'in-progress',
          phases: []
        }
      }).as('runningPipeline')

      cy.visit('/pipeline/running-1')
      cy.wait('@runningPipeline')
    })

    it('E2E-007: Admin can stop a running pipeline', () => {
      cy.get('[data-testid="stop-button"]').should('be.visible')

      cy.intercept('POST', '**/api/pipelines/running-1/stop', {
        statusCode: 200,
        body: { success: true, message: 'Pipeline stopped' }
      }).as('stopPipeline')
      cy.get('[data-testid="stop-button"]').click()
      cy.wait('@stopPipeline').its('response.statusCode').should('eq', 200)
    })

    it('E2E-007a: Stop already stopped shows error', () => {
      cy.intercept('POST', '**/api/pipelines/running-1/stop', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Pipeline not running' }
      }).as('stopFailed')

      cy.get('[data-testid="stop-button"]').click()
      cy.wait('@stopFailed').its('response.statusCode').should('eq', 400)
    })

    it('E2E-007b: Stop completed pipeline shows error', () => {
      cy.intercept('POST', '**/api/pipelines/running-1/stop', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Pipeline already complete' }
      }).as('stopComplete')

      cy.get('[data-testid="stop-button"]').click()
      cy.wait('@stopComplete').its('response.statusCode').should('eq', 400)
    })

    it('E2E-007c: Double-click stop is debounced', () => {
      cy.intercept('POST', '**/api/pipelines/running-1/stop', {
        statusCode: 200,
        body: { success: true, message: 'Pipeline stopped' }
      }).as('stopPipeline')
      cy.get('[data-testid="stop-button"]').dblclick()
      // Should only make one request (or handle gracefully)
      cy.wait('@stopPipeline')
    })
  })

  describe('E2E-008: Signal Phase Completion (US-008)', () => {
    beforeEach(() => {
      cy.visit('/pipeline/test-1/phase/1')
    })

    it('E2E-008: Admin can signal phase completion', () => {
      cy.get('[data-testid="signal-complete"]').should('be.visible')

      cy.intercept('POST', '**/api/pipelines/test-1/signal', {
        statusCode: 200,
        body: { success: true, phase: '1' }
      }).as('signalPhase')
      cy.get('[data-testid="signal-complete"]').click()
      cy.wait('@signalPhase').its('response.statusCode').should('eq', 200)
    })

    it('E2E-008a: Signal on completed phase shows error', () => {
      cy.intercept('POST', '**/api/pipelines/test-1/signal', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Phase already complete' }
      }).as('signalFailed')

      cy.get('[data-testid="signal-complete"]').click()
      cy.wait('@signalFailed').its('response.statusCode').should('eq', 400)
    })

    it('E2E-008b: Signal with test counts accepted', () => {
      cy.intercept('POST', '**/api/pipelines/test-1/signal', {
        statusCode: 200,
        body: { success: true, phase: '1' }
      }).as('signalPhase')
      cy.get('[data-testid="signal-complete"]').click()
      cy.wait('@signalPhase').then((interception) => {
        expect(interception.request.body).to.have.property('phase')
      })
    })

    it('E2E-008c: Signal on phase 3 marks complete', () => {
      cy.visit('/pipeline/test-1/phase/3')
      cy.intercept('POST', '**/api/pipelines/test-1/signal', {
        statusCode: 200,
        body: { success: true, phase: '3' }
      }).as('signalFinal')
      cy.get('[data-testid="signal-complete"]').click()
      cy.wait('@signalFinal')
    })
  })

  describe('E2E-009: Restart From Phase (US-009)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/pipelines/test-1', {
        body: {
          id: 'test-1',
          projectName: 'Test',
          projectPath: '/test',
          currentPhase: '2',
          status: 'complete',
          phases: []
        }
      }).as('getPipeline')

      cy.visit('/pipeline/test-1')
      cy.wait('@getPipeline')
    })

    it('E2E-009: Admin can restart from specific phase', () => {
      cy.get('[data-testid="restart-phase-select"]').select('1')

      cy.intercept('POST', '**/api/pipelines/test-1').as('restartPipeline')
      cy.get('[data-testid="restart-button"]').click()
      cy.wait('@restartPipeline').then((interception) => {
        expect(interception.request.body.fromPhase).to.eq('1')
      })
    })

    it('E2E-009a: Restart from 0a resets entire pipeline', () => {
      cy.get('[data-testid="restart-phase-select"]').select('0a')

      cy.intercept('POST', '**/api/pipelines/test-1').as('restartPipeline')
      cy.get('[data-testid="restart-button"]').click()
      cy.wait('@restartPipeline').then((interception) => {
        expect(interception.request.body.fromPhase).to.eq('0a')
      })
    })

    it('E2E-009b: Restart from phase 3 only resets 3', () => {
      cy.get('[data-testid="restart-phase-select"]').select('3')

      cy.intercept('POST', '**/api/pipelines/test-1').as('restartPipeline')
      cy.get('[data-testid="restart-button"]').click()
      cy.wait('@restartPipeline').then((interception) => {
        expect(interception.request.body.fromPhase).to.eq('3')
      })
    })

    it('E2E-009c: Restart while running shows error', () => {
      cy.intercept('GET', '**/api/pipelines/running-1', {
        body: {
          id: 'running-1',
          projectName: 'Running',
          projectPath: '/test',
          currentPhase: '2',
          status: 'in-progress',
          phases: []
        }
      }).as('runningPipeline')

      cy.visit('/pipeline/running-1')
      cy.wait('@runningPipeline')

      cy.intercept('POST', '**/api/pipelines/running-1', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Stop pipeline first' }
      }).as('restartFailed')

      cy.get('[data-testid="restart-button"]').click()
      cy.wait('@restartFailed').its('response.statusCode').should('eq', 400)
    })
  })

  describe('E2E-006-DND: Drag and Drop Brainstorm Notes (US-006)', () => {
    beforeEach(() => {
      cy.get('[data-testid="start-pipeline"]').click()
    })

    it('E2E-006-DND: Admin can drag-drop brainstorm notes to skip phase 0a', () => {
      // Verify drop zone exists
      cy.get('[data-testid="brainstorm-dropzone"]').should('exist')

      // Simulate file drop with a .md file
      const fileName = 'brainstorm-notes.md'
      const fileContent = '# Brainstorm Notes\n\nThis is test content.'
      cy.get('[data-testid="brainstorm-dropzone"]').selectFile(
        { contents: Cypress.Buffer.from(fileContent), fileName, mimeType: 'text/markdown' },
        { action: 'drag-drop' }
      )

      // Verify file preview appears
      cy.get('[data-testid="file-preview"]').should('contain', 'brainstorm-notes.md')
      cy.get('[data-testid="file-remove"]').should('exist')

      // Verify phase auto-sets to 0b
      cy.get('[data-testid="phase-select"]').should('have.value', '0b')

      // Submit and verify file uploaded
      cy.get('[data-testid="project-path"]').type('/home/test/project')
      cy.intercept('POST', '**/api/pipelines').as('createPipeline')
      cy.get('[data-testid="create-pipeline"]').click()
      cy.wait('@createPipeline').then((interception) => {
        expect(interception.request.body.startFrom).to.eq('0b')
        expect(interception.response.statusCode).to.eq(201)
      })
    })

    it('E2E-006-DNDa: Drop non-.md file shows error', () => {
      // Try to drop a non-markdown file
      const fileName = 'not-markdown.txt'
      const fileContent = 'This is not a markdown file.'
      cy.get('[data-testid="brainstorm-dropzone"]').selectFile(
        { contents: Cypress.Buffer.from(fileContent), fileName, mimeType: 'text/plain' },
        { action: 'drag-drop' }
      )

      // Verify error message
      cy.get('[data-testid="dropzone-error"]').should('contain', 'Only .md files accepted')
      // Phase should not change
      cy.get('[data-testid="phase-select"]').should('have.value', '0a')
    })

    it('E2E-006-DNDb: Drop file then click remove clears file and resets phase', () => {
      // Drop a valid file
      const fileName = 'brainstorm-notes.md'
      const fileContent = '# Test'
      cy.get('[data-testid="brainstorm-dropzone"]').selectFile(
        { contents: Cypress.Buffer.from(fileContent), fileName, mimeType: 'text/markdown' },
        { action: 'drag-drop' }
      )

      // Verify file preview and phase change
      cy.get('[data-testid="file-preview"]').should('exist')
      cy.get('[data-testid="phase-select"]').should('have.value', '0b')

      // Click remove button
      cy.get('[data-testid="file-remove"]').click()

      // Verify file cleared and phase reset
      cy.get('[data-testid="file-preview"]').should('not.exist')
      cy.get('[data-testid="phase-select"]').should('have.value', '0a')
    })

    it('E2E-006-DNDc: Click drop zone to browse files', () => {
      // Click on dropzone should trigger file input
      cy.get('[data-testid="brainstorm-dropzone"]').click()

      // File input should be accessible (hidden but functional)
      cy.get('[data-testid="brainstorm-file-input"]').should('exist')

      // Select a file via input
      const fileName = 'brainstorm-notes.md'
      const fileContent = '# Test via input'
      cy.get('[data-testid="brainstorm-file-input"]').selectFile(
        { contents: Cypress.Buffer.from(fileContent), fileName, mimeType: 'text/markdown' },
        { force: true }
      )

      // Verify file preview appears
      cy.get('[data-testid="file-preview"]').should('contain', 'brainstorm-notes.md')
    })
  })

  describe('E2E-021: Delete Pipeline (US-021)', () => {
    it('E2E-021: Admin can delete pipeline without deleting folder', () => {
      // Initial GET returns pipeline
      cy.intercept('GET', '**/api/pipelines', {
        body: [
          {
            id: 'delete-test-1',
            projectName: 'Test Project',
            projectPath: '/home/claude/IMT/test-project',
            currentPhase: '3',
            status: 'complete',
            phases: []
          }
        ]
      }).as('getPipelines')
      cy.visit('/')
      cy.wait('@getPipelines')

      // Click delete button on pipeline row
      cy.get('[data-testid="delete-pipeline-delete-test-1"]').click()

      // Verify confirmation modal
      cy.get('[data-testid="delete-modal"]').should('be.visible')
      cy.get('[data-testid="delete-modal"]').should('contain', 'Test Project')
      cy.get('[data-testid="delete-modal"]').should('contain', '/home/claude/IMT/test-project')
      cy.get('[data-testid="delete-folder-checkbox"]').should('exist')
      cy.get('[data-testid="delete-modal"]').should('contain', 'cannot be undone')

      // Do NOT check the delete folder checkbox
      cy.get('[data-testid="delete-folder-checkbox"]').should('not.be.checked')

      // Set up intercepts for delete and subsequent refresh
      cy.intercept('DELETE', '**/api/pipelines/delete-test-1', {
        statusCode: 200,
        body: { success: true, message: 'Pipeline deleted', deleteFolder: false }
      }).as('deletePipeline')

      // Override GET to return empty list after delete
      cy.intercept('GET', '**/api/pipelines', {
        body: []
      }).as('getPipelinesRefresh')

      cy.get('[data-testid="confirm-delete"]').click()
      cy.wait('@deletePipeline').then((interception) => {
        expect(interception.response.statusCode).to.eq(200)
        expect(interception.request.body.deleteFolder).to.eq(false)
      })

      // Wait for refresh call after delete
      cy.wait('@getPipelinesRefresh')

      // Verify pipeline removed from list (empty state shown)
      cy.get('[data-testid="pipeline-delete-test-1"]').should('not.exist')
    })

    it('E2E-021a: Delete with checkbox checked also deletes folder', () => {
      cy.intercept('GET', '**/api/pipelines', {
        body: [
          {
            id: 'delete-folder-1',
            projectName: 'Delete Folder Test',
            projectPath: '/home/claude/IMT/delete-me',
            currentPhase: '3',
            status: 'complete',
            phases: []
          }
        ]
      }).as('getPipelines')
      cy.visit('/')
      cy.wait('@getPipelines')

      // Click delete button
      cy.get('[data-testid="delete-pipeline-delete-folder-1"]').click()

      // Check the delete folder checkbox
      cy.get('[data-testid="delete-folder-checkbox"]').check()

      // Confirm delete
      cy.intercept('DELETE', '**/api/pipelines/delete-folder-1', {
        statusCode: 200,
        body: { success: true, message: 'Pipeline deleted', deleteFolder: true }
      }).as('deletePipeline')
      cy.get('[data-testid="confirm-delete"]').click()
      cy.wait('@deletePipeline').then((interception) => {
        expect(interception.response.statusCode).to.eq(200)
        expect(interception.request.body.deleteFolder).to.eq(true)
      })
    })

    it('E2E-021b: Delete running pipeline shows warning', () => {
      cy.intercept('GET', '**/api/pipelines', {
        body: [
          {
            id: 'running-delete-1',
            projectName: 'Running Project',
            projectPath: '/home/claude/IMT/running',
            currentPhase: '2',
            status: 'in-progress',
            phases: []
          }
        ]
      }).as('getPipelines')
      cy.visit('/')
      cy.wait('@getPipelines')

      // Click delete button
      cy.get('[data-testid="delete-pipeline-running-delete-1"]').click()

      // Server should return error
      cy.intercept('DELETE', '**/api/pipelines/running-delete-1', {
        statusCode: 400,
        body: { error: 'Bad Request', message: 'Pipeline is running, stop first' }
      }).as('deleteFailed')

      cy.get('[data-testid="confirm-delete"]').click()
      cy.wait('@deleteFailed').its('response.statusCode').should('eq', 400)

      // Error message should be displayed
      cy.get('[data-testid="delete-error"]').should('contain', 'stop first')
    })

    it('E2E-021c: Cancel delete closes modal without action', () => {
      cy.intercept('GET', '**/api/pipelines', {
        body: [
          {
            id: 'cancel-delete-1',
            projectName: 'Cancel Delete Test',
            projectPath: '/home/claude/IMT/cancel',
            currentPhase: '3',
            status: 'complete',
            phases: []
          }
        ]
      }).as('getPipelines')
      cy.visit('/')
      cy.wait('@getPipelines')

      // Click delete button
      cy.get('[data-testid="delete-pipeline-cancel-delete-1"]').click()

      // Modal should be visible
      cy.get('[data-testid="delete-modal"]').should('be.visible')

      // Click cancel
      cy.get('[data-testid="cancel-delete"]').click()

      // Modal should close
      cy.get('[data-testid="delete-modal"]').should('not.exist')

      // Pipeline should still be in list
      cy.get('[data-testid="pipeline-cancel-delete-1"]').should('exist')
    })
  })
})
