import { CopyTradeEngine } from '../services/copytrade/engine';
const engine = new CopyTradeEngine();
engine.start();
process.on('SIGTERM', () => engine.stop());
