import { SellEngine } from '../services/trading/sell-engine';
const engine = new SellEngine();
engine.start();
process.on('SIGTERM', () => engine.stop());
