export const APP_CONFIG = {
  basePath: '/mesh-prompt-central',
} as const;

export const getFullPath = (path: string = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${APP_CONFIG.basePath}${cleanPath}`;
};

export const getBaseUrl = () => {
  return `${window.location.origin}${APP_CONFIG.basePath}`;
}; 