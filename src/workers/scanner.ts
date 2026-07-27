import { scanner } from '../services/scanner/engine';
scanner.start();
process.on('SIGTERM', () => scanner.stop());
