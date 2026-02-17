import express from 'express';
import http from 'http';
import { HOST, PORT } from './config.js';
import { setupWebSocket } from './broadcast.js';
import { setupMiddleware } from './middleware.js';
import router from './routes.js';

const app = express();
const server = http.createServer(app);

setupWebSocket(server);
setupMiddleware(app);
app.use(router);

if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
  console.warn(
    `[WARN] HOST is set to ${HOST}. This exposes the dashboard beyond localhost unless restricted by firewall/network policy.`
  );
}

server.listen(PORT, HOST, () => {
  console.log(`Dashboard running at http://${HOST}:${PORT}`);
});
