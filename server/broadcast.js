import { WebSocketServer } from 'ws';

let wss;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
}

export function broadcast(type, data) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}
