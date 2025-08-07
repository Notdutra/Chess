// Utility to get the correct base path for assets
export const getBasePath = (): string => {
  // In development, no base path needed
  // In production (GitHub Pages), use the base path
  if (typeof window !== 'undefined') {
    // Client-side: check the current location
    return window.location.pathname.startsWith('/Chess-game')
      ? '/Chess-game'
      : '';
  }
  // Server-side: use environment variable
  return process.env.NODE_ENV === 'production' ? '/Chess-game' : '';
};
