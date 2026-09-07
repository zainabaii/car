import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Vite plugin to handle Netlify function endpoints during local `npm run dev`
function netlifyLocalFunctionsPlugin() {
  return {
    name: 'netlify-local-functions',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          const endpoint = req.url.replace('/api/', '').split('?')[0];
          
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            let parsedBody = {};
            try {
              if (body) parsedBody = JSON.parse(body);
            } catch (e) {}

            try {
              // Dynamically import the netlify function handler
              const functionPath = `./netlify/functions/${endpoint}.js`;
              const mod = await import(functionPath /* @vite-ignore */);
              const handler = mod.handler || mod.default;

              if (handler) {
                const event = {
                  path: req.url,
                  httpMethod: req.method,
                  headers: req.headers,
                  queryStringParameters: Object.fromEntries(new URL(req.url, `http://${req.headers.host}`).searchParams),
                  body: body
                };

                const context = {};
                const result = await handler(event, context);

                res.statusCode = result.statusCode || 200;
                if (result.headers) {
                  Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body || '');
                return;
              }
            } catch (err) {
              console.error(`[Local Function Handler Error: ${endpoint}]`, err.message);
            }
            next();
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), netlifyLocalFunctionsPlugin()],
  server: {
    port: 3000,
    open: true
  }
});
