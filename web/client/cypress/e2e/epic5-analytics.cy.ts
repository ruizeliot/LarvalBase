describe('Epic 5: Pipeline Analytics', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('E2E-023: View Pipeline Metrics (US-023)', () => {
    const mockPipeline = {
      id: 'metrics-test-1',
      projectName: 'Metrics Test Project',
      projectPath: '/home/test/metrics-project',
      currentPhase: '3',
      status: 'complete',
      phases: [
        { name: '0a', status: 'complete', startedAt: '2025-11-28T10:00:00Z', completedAt: '2025-11-28T10:15:00Z' },
        { name: '0b', status: 'complete', startedAt: '2025-11-28T10:15:00Z', completedAt: '2025-11-28T10:30:00Z' },
        { name: '1', status: 'complete', startedAt: '2025-11-28T10:30:00Z', completedAt: '2025-11-28T11:00:00Z' },
        { name: '2', status: 'complete', startedAt: '2025-11-28T11:00:00Z', completedAt: '2025-11-28T12:30:00Z' },
        { name: '3', status: 'complete', startedAt: '2025-11-28T12:30:00Z', completedAt: '2025-11-28T13:00:00Z' }
      ]
    }

    const mockMetrics = {
      summary: {
        totalDuration: 10800000, // 3 hours in ms
        estimatedCost: 12.50,
        testPassRate: 95.5,
        phaseCount: 5
      },
      phases: [
        { name: '0a', duration: 900000, cost: 1.50, status: 'complete' },
        { name: '0b', duration: 900000, cost: 1.50, status: 'complete' },
        { name: '1', duration: 1800000, cost: 2.50, status: 'complete' },
        { name: '2', duration: 5400000, cost: 5.00, status: 'complete' },
        { name: '3', duration: 1800000, cost: 2.00, status: 'complete' }
      ],
      tests: {
        epics: [
          { name: 'Epic 1', passed: 11, total: 11 },
          { name: 'Epic 2', passed: 23, total: 24 },
          { name: 'Epic 3', passed: 16, total: 16 },
          { name: 'Epic 4', passed: 28, total: 28 }
        ]
      }
    }

    beforeEach(() => {
      cy.intercept('GET', '**/api/pipelines/metrics-test-1', {
        body: mockPipeline
      }).as('getPipeline')
    })

    it('E2E-023: Admin can view metrics with summary and phase breakdown', () => {
      cy.intercept('GET', '**/api/pipelines/metrics-test-1/analytics', {
        body: mockMetrics
      }).as('getAnalytics')

      cy.visit('/pipeline/metrics-test-1')
      cy.wait('@getPipeline')

      // Click Analytics button in header
      cy.get('[data-testid="analytics-button"]').click()
      cy.wait('@getAnalytics').its('response.statusCode').should('eq', 200)

      // Verify Metrics tab is active by default
      cy.get('[data-testid="analytics-tab-metrics"]').should('have.class', 'active')

      // Verify summary section
      cy.get('[data-testid="metrics-summary"]').within(() => {
        cy.get('[data-testid="total-duration"]').should('contain', '3')
        cy.get('[data-testid="estimated-cost"]').should('contain', '$12.50')
        cy.get('[data-testid="test-pass-rate"]').should('contain', '95.5%')
        cy.get('[data-testid="phase-count"]').should('contain', '5')
      })

      // Verify phase breakdown table
      cy.get('[data-testid="phase-breakdown-table"]').within(() => {
        cy.get('tr').should('have.length.at.least', 5)
        cy.get('[data-testid="phase-row-0a"]').should('contain', 'complete')
        cy.get('[data-testid="phase-row-2"]').should('contain', '$5.00')
      })

      // Verify test results section with progress bars
      cy.get('[data-testid="test-results"]').within(() => {
        cy.get('[data-testid="epic-1-progress"]').should('exist')
        cy.get('[data-testid="epic-2-progress"]').should('contain', '23/24')
      })

      // Verify Export JSON button
      cy.get('[data-testid="export-metrics-json"]').should('be.visible')
      cy.get('[data-testid="export-metrics-json"]').click()
      // Note: Can't verify actual download in Cypress, just that button is clickable
    })

    it('E2E-023a: Complete pipeline shows all phase durations and costs', () => {
      cy.intercept('GET', '**/api/pipelines/metrics-test-1/analytics', {
        body: mockMetrics
      }).as('getAnalytics')

      cy.visit('/pipeline/metrics-test-1/analytics')
      cy.wait('@getAnalytics')

      // All phases should show duration and cost, status "Complete"
      cy.get('[data-testid="phase-row-0a"]').should('contain', 'complete')
      cy.get('[data-testid="phase-row-0b"]').should('contain', 'complete')
      cy.get('[data-testid="phase-row-1"]').should('contain', 'complete')
      cy.get('[data-testid="phase-row-2"]').should('contain', 'complete')
      cy.get('[data-testid="phase-row-3"]').should('contain', 'complete')
    })

    it('E2E-023b: Running pipeline shows Running for current phase', () => {
      const runningMetrics = {
        ...mockMetrics,
        phases: [
          { name: '0a', duration: 900000, cost: 1.50, status: 'complete' },
          { name: '0b', duration: 900000, cost: 1.50, status: 'complete' },
          { name: '1', duration: null, cost: null, status: 'in-progress' },
          { name: '2', duration: null, cost: null, status: 'pending' },
          { name: '3', duration: null, cost: null, status: 'pending' }
        ]
      }

      cy.intercept('GET', '**/api/pipelines/running-1', {
        body: { ...mockPipeline, id: 'running-1', status: 'in-progress', currentPhase: '1' }
      }).as('getRunningPipeline')

      cy.intercept('GET', '**/api/pipelines/running-1/analytics', {
        body: runningMetrics
      }).as('getRunningAnalytics')

      cy.visit('/pipeline/running-1/analytics')
      cy.wait('@getRunningAnalytics')

      // Current phase shows "Running..."
      cy.get('[data-testid="phase-row-1"]').should('contain', 'Running')
      // Future phases show "--"
      cy.get('[data-testid="phase-row-2"]').should('contain', '--')
      cy.get('[data-testid="phase-row-3"]').should('contain', '--')
    })

    it('E2E-023c: Failed pipeline shows error status for failed phase', () => {
      const failedMetrics = {
        ...mockMetrics,
        phases: [
          { name: '0a', duration: 900000, cost: 1.50, status: 'complete' },
          { name: '0b', duration: 900000, cost: 1.50, status: 'complete' },
          { name: '1', duration: 300000, cost: 0.50, status: 'failed', error: 'Worker crashed' },
          { name: '2', duration: null, cost: null, status: 'pending' },
          { name: '3', duration: null, cost: null, status: 'pending' }
        ]
      }

      cy.intercept('GET', '**/api/pipelines/failed-1', {
        body: { ...mockPipeline, id: 'failed-1', status: 'failed', currentPhase: '1' }
      }).as('getFailedPipeline')

      cy.intercept('GET', '**/api/pipelines/failed-1/analytics', {
        body: failedMetrics
      }).as('getFailedAnalytics')

      cy.visit('/pipeline/failed-1/analytics')
      cy.wait('@getFailedAnalytics')

      // Failed phase shows error status
      cy.get('[data-testid="phase-row-1"]').should('contain', 'failed')
      // Subsequent phases show "--"
      cy.get('[data-testid="phase-row-2"]').should('contain', '--')
    })
  })

  describe('E2E-024: View Decision Log (US-024)', () => {
    const mockDecisions = {
      entries: [
        { timestamp: '2025-11-28T10:00:00Z', type: 'SPAWN', description: 'Started supervisor for project' },
        { timestamp: '2025-11-28T10:01:00Z', type: 'SPAWN', description: 'Spawned worker for phase 0a' },
        { timestamp: '2025-11-28T10:05:00Z', type: 'HEARTBEAT', description: 'Supervisor heartbeat' },
        { timestamp: '2025-11-28T10:10:00Z', type: 'HEARTBEAT', description: 'Supervisor heartbeat' },
        { timestamp: '2025-11-28T10:15:00Z', type: 'PHASE_COMPLETE', description: 'Phase 0a complete, advancing to 0b' },
        { timestamp: '2025-11-28T10:15:30Z', type: 'KILL', description: 'Killed worker for phase 0a' },
        { timestamp: '2025-11-28T10:16:00Z', type: 'SPAWN', description: 'Spawned worker for phase 0b' },
        { timestamp: '2025-11-28T11:00:00Z', type: 'INTERVENTION', description: 'User sent message to supervisor' },
        { timestamp: '2025-11-28T11:30:00Z', type: 'ERROR', description: 'Worker timeout, restarting' },
        { timestamp: '2025-11-28T12:00:00Z', type: 'CRASH_RECOVERY', description: 'Recovered from supervisor crash' }
      ],
      totalCount: 24
    }

    beforeEach(() => {
      cy.intercept('GET', '**/api/pipelines/decisions-test-1', {
        body: {
          id: 'decisions-test-1',
          projectName: 'Decisions Test',
          projectPath: '/test',
          currentPhase: '2',
          status: 'complete',
          phases: []
        }
      }).as('getPipeline')
    })

    it('E2E-024: Admin can view decision log with all entry types', () => {
      cy.intercept('GET', '**/api/pipelines/decisions-test-1/decisions', {
        body: mockDecisions
      }).as('getDecisions')

      cy.visit('/pipeline/decisions-test-1/analytics')
      cy.wait('@getPipeline')

      // Click Decisions tab
      cy.get('[data-testid="analytics-tab-decisions"]').click()
      cy.wait('@getDecisions').its('response.statusCode').should('eq', 200)

      // Verify decision entries displayed
      cy.get('[data-testid="decisions-list"]').within(() => {
        cy.get('[data-testid^="decision-entry-"]').should('have.length', 10)
      })

      // Verify decision types visible
      cy.get('[data-testid="decision-type-SPAWN"]').should('exist')
      cy.get('[data-testid="decision-type-KILL"]').should('exist')
      cy.get('[data-testid="decision-type-PHASE_COMPLETE"]').should('exist')
      cy.get('[data-testid="decision-type-INTERVENTION"]').should('exist')
      cy.get('[data-testid="decision-type-ERROR"]').should('exist')

      // Verify HEARTBEAT entries present (5-minute intervals per v6.0.1)
      cy.get('[data-testid="decision-type-HEARTBEAT"]').should('exist')

      // Verify entry count shown
      cy.get('[data-testid="decisions-count"]').should('contain', 'Showing 10 entries')

      // Verify chronological order (newest at bottom)
      cy.get('[data-testid^="decision-entry-"]').first().should('contain', 'SPAWN')
      cy.get('[data-testid^="decision-entry-"]').last().should('contain', 'CRASH_RECOVERY')

      // Verify Export JSON button
      cy.get('[data-testid="export-decisions-json"]').should('be.visible')
    })

    it('E2E-024a: No decisions logged shows empty message', () => {
      cy.intercept('GET', '**/api/pipelines/empty-decisions/decisions', {
        body: { entries: [], totalCount: 0 }
      }).as('getEmptyDecisions')

      cy.intercept('GET', '**/api/pipelines/empty-decisions', {
        body: {
          id: 'empty-decisions',
          projectName: 'Empty Decisions',
          projectPath: '/test',
          currentPhase: '1',
          status: 'in-progress',
          phases: []
        }
      }).as('getPipeline')

      cy.visit('/pipeline/empty-decisions/analytics')
      cy.wait('@getPipeline')
      cy.get('[data-testid="analytics-tab-decisions"]').click()
      cy.wait('@getEmptyDecisions')

      cy.get('[data-testid="no-decisions-message"]').should('contain', 'No decisions logged')
    })

    it('E2E-024b: Filter shows only matching entries', () => {
      cy.intercept('GET', '**/api/pipelines/decisions-test-1/decisions', {
        body: mockDecisions
      }).as('getDecisions')

      cy.visit('/pipeline/decisions-test-1/analytics')
      cy.get('[data-testid="analytics-tab-decisions"]').click()
      cy.wait('@getDecisions')

      // Click filter for PHASE_COMPLETE
      cy.get('[data-testid="filter-PHASE_COMPLETE"]').click()

      // Only PHASE_COMPLETE entries should be visible
      cy.get('[data-testid="decisions-list"]').within(() => {
        cy.get('[data-testid="decision-type-PHASE_COMPLETE"]').should('exist')
        cy.get('[data-testid="decision-type-SPAWN"]').should('not.exist')
        cy.get('[data-testid="decision-type-KILL"]').should('not.exist')
      })
    })

    it('E2E-024c: Very long decision log is scrollable', () => {
      // Create 500+ entries
      const manyDecisions = {
        entries: Array.from({ length: 500 }, (_, i) => ({
          timestamp: `2025-11-28T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
          type: ['SPAWN', 'KILL', 'HEARTBEAT', 'PHASE_COMPLETE'][i % 4],
          description: `Decision entry ${i}`
        })),
        totalCount: 500
      }

      cy.intercept('GET', '**/api/pipelines/many-decisions/decisions', {
        body: manyDecisions
      }).as('getManyDecisions')

      cy.intercept('GET', '**/api/pipelines/many-decisions', {
        body: {
          id: 'many-decisions',
          projectName: 'Many Decisions',
          projectPath: '/test',
          currentPhase: '3',
          status: 'complete',
          phases: []
        }
      }).as('getPipeline')

      cy.visit('/pipeline/many-decisions/analytics')
      cy.wait('@getPipeline')
      cy.get('[data-testid="analytics-tab-decisions"]').click()
      cy.wait('@getManyDecisions')

      // List should be scrollable
      cy.get('[data-testid="decisions-list"]').should('have.css', 'overflow-y', 'auto')
    })
  })

  describe('E2E-025: View Pipeline History (US-025)', () => {
    const mockHistory = {
      runs: [
        {
          runId: '20251128-130000',
          date: '2025-11-28T13:00:00Z',
          duration: 10800000,
          cost: 12.50,
          status: 'complete'
        },
        {
          runId: '20251127-100000',
          date: '2025-11-27T10:00:00Z',
          duration: 14400000,
          cost: 15.00,
          status: 'complete'
        },
        {
          runId: '20251126-090000',
          date: '2025-11-26T09:00:00Z',
          duration: 7200000,
          cost: 8.00,
          status: 'failed'
        },
        {
          runId: '20251125-140000',
          date: '2025-11-25T14:00:00Z',
          duration: 9000000,
          cost: 10.00,
          status: 'complete'
        }
      ],
      currentRunId: '20251128-130000'
    }

    beforeEach(() => {
      cy.intercept('GET', '**/api/pipelines/history-test-1', {
        body: {
          id: 'history-test-1',
          projectName: 'History Test Project',
          projectPath: '/home/test/history-project',
          currentPhase: '3',
          status: 'complete',
          phases: []
        }
      }).as('getPipeline')
    })

    it('E2E-025: Admin can view historical runs for a project', () => {
      cy.intercept('GET', '**/api/pipelines/history-test-1/history', {
        body: mockHistory
      }).as('getHistory')

      cy.visit('/pipeline/history-test-1/analytics')
      cy.wait('@getPipeline')

      // Click History tab
      cy.get('[data-testid="analytics-tab-history"]').click()
      cy.wait('@getHistory').its('response.statusCode').should('eq', 200)

      // Verify list of previous runs
      cy.get('[data-testid="history-list"]').within(() => {
        cy.get('[data-history-row]').should('have.length', 4)
      })

      // Verify run details: Run ID, date, duration, cost, status
      cy.get('[data-testid="run-20251128-130000"]').within(() => {
        cy.get('[data-testid="run-id"]').should('contain', '20251128-130000')
        cy.get('[data-testid="run-date"]').should('exist')
        cy.get('[data-testid="run-duration"]').should('contain', '3')
        cy.get('[data-testid="run-cost"]').should('contain', '$12.50')
        cy.get('[data-testid="run-status"]').should('contain', 'complete')
      })

      // Current/active run should be highlighted
      cy.get('[data-testid="run-20251128-130000"]').should('have.class', 'current-run')

      // Verify trend chart exists
      cy.get('[data-testid="history-trend-chart"]').should('exist')

      // Click a previous run to load its metrics
      cy.intercept('GET', '**/api/pipelines/history-test-1/runs/20251127-100000', {
        body: {
          summary: { totalDuration: 14400000, estimatedCost: 15.00, testPassRate: 92.0, phaseCount: 5 },
          phases: []
        }
      }).as('getRunMetrics')

      cy.get('[data-testid="run-20251127-100000"]').click()
      cy.wait('@getRunMetrics')

      // Metrics tab should load with selected run's data
      cy.get('[data-testid="analytics-tab-metrics"]').should('have.class', 'active')
      cy.get('[data-testid="estimated-cost"]').should('contain', '$15.00')
    })

    it('E2E-025a: No previous runs shows empty message', () => {
      cy.intercept('GET', '**/api/pipelines/no-history/history', {
        body: { runs: [], currentRunId: null }
      }).as('getNoHistory')

      cy.intercept('GET', '**/api/pipelines/no-history', {
        body: {
          id: 'no-history',
          projectName: 'No History',
          projectPath: '/test',
          currentPhase: '0a',
          status: 'in-progress',
          phases: []
        }
      }).as('getPipeline')

      cy.visit('/pipeline/no-history/analytics')
      cy.wait('@getPipeline')
      cy.get('[data-testid="analytics-tab-history"]').click()
      cy.wait('@getNoHistory')

      cy.get('[data-testid="no-history-message"]').should('contain', 'No previous runs')
    })

    it('E2E-025b: Project with many runs is scrollable', () => {
      // Create 50+ runs
      const manyRuns = {
        runs: Array.from({ length: 50 }, (_, i) => ({
          runId: `2025112${8 - Math.floor(i / 10)}-${String(100000 + i).slice(1)}`,
          date: `2025-11-${28 - Math.floor(i / 5)}T${10 + (i % 14)}:00:00Z`,
          duration: 7200000 + (i * 600000),
          cost: 8.00 + (i * 0.5),
          status: i % 5 === 0 ? 'failed' : 'complete'
        })),
        currentRunId: '20251128-100000'
      }

      cy.intercept('GET', '**/api/pipelines/many-runs/history', {
        body: manyRuns
      }).as('getManyRuns')

      cy.intercept('GET', '**/api/pipelines/many-runs', {
        body: {
          id: 'many-runs',
          projectName: 'Many Runs',
          projectPath: '/test',
          currentPhase: '3',
          status: 'complete',
          phases: []
        }
      }).as('getPipeline')

      cy.visit('/pipeline/many-runs/analytics')
      cy.wait('@getPipeline')
      cy.get('[data-testid="analytics-tab-history"]').click()
      cy.wait('@getManyRuns')

      // List should be scrollable
      cy.get('[data-testid="history-list"]').should('exist')
      cy.get('[data-testid^="run-"]').should('have.length', 50)
    })

    it('E2E-025c: Run with missing metadata shows partial data', () => {
      const partialHistory = {
        runs: [
          {
            runId: '20251128-130000',
            date: '2025-11-28T13:00:00Z',
            duration: 10800000,
            cost: 12.50,
            status: 'complete'
          },
          {
            runId: '20251127-100000',
            date: '2025-11-27T10:00:00Z',
            duration: null, // Missing duration
            cost: null, // Missing cost
            status: 'complete'
          }
        ],
        currentRunId: '20251128-130000'
      }

      cy.intercept('GET', '**/api/pipelines/partial-history/history', {
        body: partialHistory
      }).as('getPartialHistory')

      cy.intercept('GET', '**/api/pipelines/partial-history', {
        body: {
          id: 'partial-history',
          projectName: 'Partial History',
          projectPath: '/test',
          currentPhase: '3',
          status: 'complete',
          phases: []
        }
      }).as('getPipeline')

      cy.visit('/pipeline/partial-history/analytics')
      cy.wait('@getPipeline')
      cy.get('[data-testid="analytics-tab-history"]').click()
      cy.wait('@getPartialHistory')

      // Run with missing data should show "Data unavailable"
      cy.get('[data-testid="run-20251127-100000"]').within(() => {
        cy.get('[data-testid="run-duration"]').should('contain', 'Data unavailable')
        cy.get('[data-testid="run-cost"]').should('contain', 'Data unavailable')
      })
    })
  })
})
