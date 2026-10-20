const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs the action up to maxAttempts times, waiting delayMs more after each failure; throws the last error. */
export const withRetries = async <T>(
  action: () => Promise<T>,
  maxAttempts: number,
  delayMs: number,
  onFailure: (attempt: number, error: unknown) => void = () => undefined
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      onFailure(attempt, error);
      if (attempt >= maxAttempts) throw error;
      await wait(delayMs * attempt);
    }
  }
};
