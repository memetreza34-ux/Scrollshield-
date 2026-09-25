/**
 * Formats of credentials that must never end up in the repository or in the
 * built app. A Firebase/Google API key did once (firebase-applet-config.json,
 * removed in e15ff43); the checks at the time only knew private keys and
 * signing passwords.
 */
export const apiKeyPatterns = [
  { pattern: /AIza[0-9A-Za-z_-]{35}/, reason: 'Google/Firebase API key found.' },
  { pattern: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/, reason: 'OpenAI or Anthropic API key found.' },
  {
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}/,
    reason: 'GitHub token found.',
  },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, reason: 'AWS access key found.' },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, reason: 'Slack token found.' },
  { pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/, reason: 'Stripe live key found.' },
];
