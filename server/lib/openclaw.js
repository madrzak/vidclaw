import { OPENCLAW_API_BASE } from '../config.js';

export async function fetchOpenclawJson(endpoint) {
  const url = `${OPENCLAW_API_BASE}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OpenClaw returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`Endpoint ${endpoint} returns HTML (web page), not JSON API`);
  }
  return await response.json();
}
