/**
 * Configuration options for OutputRateLimiter.
 */
export interface OutputRateLimiterOptions {
  /** Maximum number of messages allowed per sliding window. Defaults to 1000. */
  maxMessagesPerWindow?: number;
  /** Callback triggered when a suppression window flushes suppressed counts. */
  onSuppressedFlush?: (suppressedCount: number) => void;
  /** Duration of the sliding window in milliseconds. Defaults to 1000ms. */
  windowDurationMs?: number;
}

/**
 * Enforces output throughput limits to prevent unconstrained message flooding
 * across the Web Worker postMessage boundary.
 */
export class OutputRateLimiter {
  #maxMessagesPerWindow: number;
  readonly #windowDurationMs: number;
  readonly #onSuppressedFlush?: (suppressedCount: number) => void;

  #windowStartTimestamp = 0;
  #emittedCountInWindow = 0;
  #suppressedCountInWindow = 0;

  constructor(options: OutputRateLimiterOptions = {}) {
    this.#maxMessagesPerWindow = options.maxMessagesPerWindow ?? 5000;
    this.#windowDurationMs = options.windowDurationMs ?? 1000;
    this.#onSuppressedFlush = options.onSuppressedFlush;
  }

  /**
   * Updates the maximum messages permitted per sliding window.
   */
  updateMaxMessagesPerWindow(maxMessagesPerWindow: number): void {
    if (maxMessagesPerWindow > 0 && Number.isFinite(maxMessagesPerWindow)) {
      this.#maxMessagesPerWindow = maxMessagesPerWindow;
    }
  }

  /**
   * Evaluates if an output message can be dispatched.
   * Suppresses messages exceeding the window threshold.
   */
  shouldAllowMessage(): boolean {
    const currentTimestamp = Date.now();

    if (
      this.#windowStartTimestamp === 0 ||
      currentTimestamp - this.#windowStartTimestamp >= this.#windowDurationMs
    ) {
      if (this.#suppressedCountInWindow > 0) {
        this.#onSuppressedFlush?.(this.#suppressedCountInWindow);
      }
      this.#windowStartTimestamp = currentTimestamp;
      this.#emittedCountInWindow = 0;
      this.#suppressedCountInWindow = 0;
    }

    if (this.#emittedCountInWindow < this.#maxMessagesPerWindow) {
      this.#emittedCountInWindow += 1;
      return true;
    }

    this.#suppressedCountInWindow += 1;
    return false;
  }

  /**
   * Flushes any remaining suppressed message count at execution completion.
   */
  flushSuppressedNotice(): void {
    if (this.#suppressedCountInWindow > 0) {
      this.#onSuppressedFlush?.(this.#suppressedCountInWindow);
      this.#suppressedCountInWindow = 0;
    }
  }

  /**
   * Resets rate limiter metrics and window timestamps.
   */
  resetLimits(): void {
    this.#windowStartTimestamp = 0;
    this.#emittedCountInWindow = 0;
    this.#suppressedCountInWindow = 0;
  }
}
