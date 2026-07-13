import { serve } from './node-serve.js';
import { createApp } from './app.js';
import { config } from '../config.js';

const app = createApp();
serve(app.fetch, config.port);
console.log(`2+ backend API listening on http://localhost:${config.port} (providers: mock=${JSON.stringify(config.providers)})`);
