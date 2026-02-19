/**
 * Constructs a full URL for API calls that is aware of the deployment subpath.
 * @param {string} path - The API endpoint path (e.g., 'api/tasks' or '/api/tasks')
 * @returns {string} The resolved absolute path relative to the domain root.
 */
export function apiUrl(path) {
  const base = window.__APP_BASE__ || '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`;
}
