import express from 'express';
import http from 'http';
import { PORT } from './config.js';
import { setupWebSocket } from './broadcast.js';
import { setupMiddleware } from './middleware.js';
import router from './routes.js';

const app = express();
const server = http.createServer(app);

setupWebSocket(server);
setupMiddleware(app);
app.use(router);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
