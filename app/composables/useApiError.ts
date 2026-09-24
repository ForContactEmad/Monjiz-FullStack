/**
 * Maps a failed $fetch to a user-facing message key. Server routes only
 * return stable codes (e.g. "rate_limited"), never internal details, so
 * the wording lives in the locale files where it belongs.
 */
export function apiErrorKey(err: unknown): string {
  const code = (err as { statusMessage?: string; data?: { statusMessage?: string } })?.data
    ?.statusMessage ?? (err as { statusMessage?: string })?.statusMessage

  switch (code) {
    case 'rate_limited':
      return 'errors.rateLimited'
    case 'invalid_input':
      return 'errors.invalidInput'
    default:
      return 'errors.generic'
  }
}
