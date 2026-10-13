// The Worker behind architecture.tools (wrangler.jsonc, docs/HOSTING.md).
// Pages, images and scripts never reach this code: Cloudflare serves them
// straight from the site's static files. Only the paths listed in
// run_worker_first come here, plus any request that matches no file.
import { handleFeedback } from './feedback.js';
import { handleInbox } from './inbox.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/feedback') {
      if (request.method === 'POST') return handleFeedback(request, env);
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    if (pathname === '/inbox') return handleInbox(request, env);
    // No file matched, or an /api/ path that doesn't exist: the static
    // files answer, which for these is a 404.
    return env.ASSETS.fetch(request);
  },
};
