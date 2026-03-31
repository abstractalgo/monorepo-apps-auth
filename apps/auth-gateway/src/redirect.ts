const DEFAULT_ALLOWED_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

export function isAllowedRedirect(url: string): boolean {
  const extraPatterns = import.meta.env.VITE_ALLOWED_REDIRECT_PATTERNS;
  const patterns = [...DEFAULT_ALLOWED_PATTERNS];

  if (extraPatterns) {
    for (const p of extraPatterns.split(",")) {
      const trimmed = p.trim();
      if (trimmed) {
        patterns.push(new RegExp(`^${trimmed}$`));
      }
    }
  }

  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    return patterns.some((pattern) => pattern.test(origin));
  } catch {
    return false;
  }
}
