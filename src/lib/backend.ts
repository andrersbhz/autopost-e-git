const RETRYABLE_MESSAGES = [
  /schema cache/i,
  /failed to fetch/i,
  /fetch failed/i,
  /load failed/i,
  /network/i,
  /upstream request timeout/i,
  /temporarily unavailable/i,
  /lock "lock:sb-.*-auth-token" was released/i,
];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const getErrorMessage = (error: unknown, fallback = 'Erro inesperado') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || fallback;

  if (typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const message = [candidate.message, candidate.error_description, candidate.details, candidate.hint].find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );

    if (typeof message === 'string') return message;
  }

  return fallback;
};

export const isRetryableBackendError = (error: unknown) => {
  const message = getErrorMessage(error, '');
  const details = typeof error === 'object' && error ? (error as Record<string, unknown>) : {};
  const code = typeof details.code === 'string' ? details.code : '';
  const status = typeof details.status === 'number' ? details.status : 0;

  return code === 'PGRST002' || status === 503 || status === 504 || RETRYABLE_MESSAGES.some((pattern) => pattern.test(message));
};

export const withBackendRetry = async <T>(
  operation: () => Promise<T>,
  options?: { retries?: number; delayMs?: number },
) => {
  const retries = options?.retries ?? 4;
  const delayMs = options?.delayMs ?? 900;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isRetryableBackendError(error)) {
        throw error;
      }

      attempt += 1;
      await sleep(delayMs * attempt);
    }
  }
};

export const runBackendQuery = async <T>(
  operation: () => PromiseLike<{ data: T; error: unknown | null }>,
  options?: { retries?: number; delayMs?: number },
): Promise<T> => {
  return withBackendRetry(async () => {
    const result = await operation();

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }, options);
};

export const runBackendMutation = async (
  operation: () => PromiseLike<{ error: unknown | null }>,
  options?: { retries?: number; delayMs?: number },
) => {
  await withBackendRetry(async () => {
    const result = await operation();

    if (result.error) {
      throw result.error;
    }

    return true;
  }, options);
};