import { useEffect, useRef } from 'react'

interface TerminalProps {
  targetId: string
  targetType: 'worker' | 'supervisor'
  className?: string
}

export default function Terminal({ targetId, targetType, className = '' }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Terminal initialization would happen here with xterm.js
    // For skeleton, we just show a placeholder with the xterm class
    // In production, this would use: new Terminal() from 'xterm'
  }, [targetId, targetType])

  return (
    <div
      ref={containerRef}
      className={`bg-black font-mono text-sm p-2 ${className}`}
      data-testid="terminal"
    >
      {/* xterm container - in production this would be initialized by xterm.js */}
      <div className="xterm">
        <div className="text-gray-400">
          Connecting to {targetType}...
        </div>
        <div className="text-green-400 mt-2">
          $ ready
        </div>
      </div>
    </div>
  )
}
