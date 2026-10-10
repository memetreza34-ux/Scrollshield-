import { createProductionServer } from './http.mjs';

const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid PORT');
}

const server = createProductionServer();
server.listen(port, '0.0.0.0');
