import { useUiStore } from '@/store/uiStore'
import { useSimulationStore } from '@/store/simulationStore'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, Clock, Play, Pause, Square, SkipForward, SkipBack } from 'lucide-react'

export function BottomPanel() {
  const activeMode = useUiStore((s) => s.activeMode)

  return (
    <div
      data-testid="bottom-panel"
      className={`flex-shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] ${activeMode === 'simulate' ? 'h-48' : 'h-28'}`}
    >
      {activeMode === 'editor' && <EditorBottomContent />}
      {activeMode === 'scenarios' && <ScenariosBottomContent />}
      {activeMode === 'simulate' && <SimulateBottomContent />}
    </div>
  )
}

function EditorBottomContent() {
  return (
    <div data-testid="bottom-panel-editor" className="flex items-center gap-3 h-full px-4">
      <SlidersHorizontal size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-[var(--color-text)]">Property Details</p>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Select a component or causal chain to view details
        </p>
      </div>
    </div>
  )
}

function ScenariosBottomContent() {
  return (
    <div data-testid="bottom-panel-scenarios" className="flex items-center gap-3 h-full px-4">
      <Clock size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-[var(--color-text)]">Timeline</p>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Scenario event timeline will appear here
        </p>
      </div>
    </div>
  )
}

function SimulateBottomContent() {
  const playbackState = useSimulationStore((s) => s.playbackState)
  const currentStep = useSimulationStore((s) => s.currentStep)
  const speed = useSimulationStore((s) => s.speed)
  const result = useSimulationStore((s) => s.result)
  const play = useSimulationStore((s) => s.play)
  const pause = useSimulationStore((s) => s.pause)
  const stop = useSimulationStore((s) => s.stop)
  const stepForward = useSimulationStore((s) => s.stepForward)
  const stepBackward = useSimulationStore((s) => s.stepBackward)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const scrubTo = useSimulationStore((s) => s.scrubTo)

  const isStopped = playbackState === 'stopped'
  const isPlaying = playbackState === 'playing'
  const isPaused = playbackState === 'paused'

  const totalSteps = result ? result.timesteps.length : 0
  const currentTime = result && result.timesteps[currentStep] ? result.timesteps[currentStep].time : 0
  const maxTime = result && totalSteps > 0 ? result.timesteps[totalSteps - 1].time : 0

  // Events up to current step for the log
  const visibleEvents = result
    ? result.timesteps.slice(0, currentStep + 1).flatMap((ts) => ts.events)
    : []

  return (
    <div data-testid="bottom-panel-simulate" className="flex flex-col h-full">
      {/* Row 1: Playback controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)]">
        {/* Transport buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={isPlaying}
            onClick={play}
            data-testid="sim-play-button"
            title="Play"
          >
            <Play size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!isPlaying}
            onClick={pause}
            data-testid="sim-pause-button"
            title="Pause"
          >
            <Pause size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={isStopped}
            onClick={stop}
            data-testid="sim-stop-button"
            title="Stop"
          >
            <Square size={14} />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--color-border)]" />

        {/* Step buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={isPlaying}
            onClick={stepBackward}
            data-testid="sim-step-backward"
            title="Step backward"
          >
            <SkipBack size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={isPlaying}
            onClick={stepForward}
            data-testid="sim-step-forward"
            title="Step forward"
          >
            <SkipForward size={14} />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--color-border)]" />

        {/* Time display */}
        <div data-testid="sim-time-display" className="font-mono text-sm text-[var(--color-primary)] min-w-[80px]">
          t = {currentTime}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--color-text-muted)]">Speed</span>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20 accent-[var(--color-primary)]"
            data-testid="sim-speed-slider"
          />
          <span data-testid="sim-speed-display" className="text-xs font-mono text-[var(--color-text)] min-w-[30px]">
            {speed}x
          </span>
        </div>
      </div>

      {/* Row 2: Scrub bar */}
      <div className="flex items-center gap-3 px-4 py-1 border-b border-[var(--color-border)]">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => scrubTo(Number(e.target.value))}
          className="flex-1 accent-[var(--color-primary)]"
          data-testid="sim-scrub-bar"
          disabled={totalSteps === 0}
        />
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono min-w-[80px] text-right">
          {currentTime} / {maxTime}
        </span>
      </div>

      {/* Row 3: Event log */}
      <div data-testid="sim-event-log" className="flex-1 overflow-y-auto px-4 py-1">
        {visibleEvents.length === 0 ? (
          <p className="text-[10px] text-[var(--color-text-muted)] py-1">No events yet</p>
        ) : (
          visibleEvents.map((event, i) => (
            <div key={i} className="text-[10px] py-0.5 flex items-center gap-1">
              <span className="font-mono text-[var(--color-primary)]">t={event.time}</span>
              <span className={event.type === 'forced' ? 'text-[var(--color-accent-orange)]' : 'text-[var(--color-text-muted)]'}>
                {event.type === 'forced' ? '[forced]' : '[cascade]'}
              </span>
              <span className="text-[var(--color-text)]">
                {event.componentName}.{event.parameterName}
              </span>
              <span className="text-[var(--color-text-muted)]">{event.oldValue} → {event.newValue}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
