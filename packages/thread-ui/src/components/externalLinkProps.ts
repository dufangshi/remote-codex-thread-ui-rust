/** Keep external websites from replacing the current thread or file preview. */
export function externalLinkProps(href: string | undefined) {
  if (!href) return {};
  try {
    const origin = typeof window === 'undefined' ? undefined : window.location.origin;
    const url = new URL(href, origin);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin) {
      return { target: '_blank', rel: 'noopener noreferrer' };
    }
  } catch { /* Relative or non-browser links retain their existing behavior. */ }
  return {};
}
