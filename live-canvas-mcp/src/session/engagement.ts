/**
 * Engagement signal detection module
 *
 * Analyzes user response patterns to detect engagement signals:
 * - terse: Very short responses (disengaged or simple)
 * - normal: Typical response length
 * - verbose: Lengthy responses (very engaged)
 * - confused: Many questions or ellipses
 * - excited: Exclamations (enthusiastic)
 */

export type EngagementSignal = 'terse' | 'normal' | 'verbose' | 'confused' | 'excited';

export interface ResponseMetrics {
  wordCount: number;
  charCount: number;  // Backup for non-English
  questionCount: number;
  exclamationCount: number;
  ellipsisCount: number;
}

/**
 * Analyze a user response and extract metrics
 * @param text User's response text
 * @returns Response metrics for engagement detection
 */
export function analyzeResponse(text: string): ResponseMetrics {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return {
    wordCount: words.length,
    charCount: text.length,
    questionCount: (text.match(/\?/g) || []).length,
    exclamationCount: (text.match(/!/g) || []).length,
    ellipsisCount: (text.match(/\.\.\./g) || []).length,
  };
}

/**
 * Detect engagement signal from response metrics
 * @param metrics Response metrics from analyzeResponse
 * @param historyAvg Average word count from recent messages (default 50)
 * @returns Engagement signal
 */
export function detectEngagement(
  metrics: ResponseMetrics,
  historyAvg: number = 50
): EngagementSignal {
  // Terse: significantly shorter than average
  if (metrics.wordCount < historyAvg * 0.3 && metrics.wordCount < 10) {
    return 'terse';
  }

  // Verbose: significantly longer than average
  if (metrics.wordCount > historyAvg * 2 && metrics.wordCount > 100) {
    return 'verbose';
  }

  // Confused: many questions or ellipses
  if (metrics.questionCount >= 2 || metrics.ellipsisCount >= 2) {
    return 'confused';
  }

  // Excited: exclamations with reasonable length
  if (metrics.exclamationCount >= 2 ||
      (metrics.wordCount > 50 && metrics.exclamationCount >= 1)) {
    return 'excited';
  }

  return 'normal';
}

// Track history for running average
let responseHistory: ResponseMetrics[] = [];
const MAX_HISTORY = 10;

/**
 * Track a response in history for running average calculation
 * @param metrics Response metrics to track
 */
export function trackResponse(metrics: ResponseMetrics): void {
  responseHistory.push(metrics);
  if (responseHistory.length > MAX_HISTORY) {
    responseHistory.shift();
  }
}

/**
 * Get average word count from response history
 * @returns Average word count (default 50 if no history)
 */
export function getHistoryAverage(): number {
  if (responseHistory.length === 0) return 50;
  return responseHistory.reduce((sum, m) => sum + m.wordCount, 0) / responseHistory.length;
}

/**
 * Reset response history (for testing or new session)
 */
export function resetResponseHistory(): void {
  responseHistory = [];
}
