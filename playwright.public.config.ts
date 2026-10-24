import {defineConfig} from '@playwright/test';
process.env.PLAYWRIGHT_BROWSERS_PATH??='0';
export default defineConfig({testDir:'tests/public',timeout:90000,workers:1,reporter:'list',outputDir:'test-results-public',globalSetup:'./tests/public/setup.ts',
 use:{baseURL:'http://127.0.0.1:8788',extraHTTPHeaders:{'X-Sandtray-Protocol':'2'},viewport:{width:1440,height:1000},launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 webServer:[{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:false},{command:'npm run build && node node_modules/wrangler/bin/wrangler.js dev --config tests/public/wrangler.jsonc --ip 127.0.0.1 --port 8788 --persist-to .wrangler/public-test',url:'http://127.0.0.1:8788/api/health',reuseExistingServer:false,timeout:120000,env:{WRANGLER_SEND_METRICS:'false',X_LOCAL_OBSERVABILITY:'false'}}]});
