import page from './index.html';

export { MyDurableObject } from './do';

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const requestPath = url.pathname;

    if (requestPath === '/') {
      let headers = new Headers();

      headers.set('Content-type', 'text/html; charset=utf-8');
      headers.set('Cache-control', 'no-store');

      return new Response(page, { headers });
    }

    let id: DurableObjectId = env.MY_DURABLE_OBJECT.idFromName('chat');

    // This stub creates a communication channel with the Durable Object instance
    // The Durable Object constructor will be invoked upon the first call for a given id
    let stub = env.MY_DURABLE_OBJECT.get(id);

    /**
     * Web Socket server for UI passing requests over to DO
     */
    if (requestPath.startsWith('/websocket')) {
      // Expect to receive a WebSocket Upgrade request.
      // If there is one, accept the request and return a WebSocket Response.
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Durable Object expected Upgrade: websocket', {
          status: 426,
        });
      }

      return stub.fetch(request);
    }

    return new Response('Page Not Found', { status: 404 });
  },

  // async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
  //   console.log('Worker: call on Cron');
  // },
} satisfies ExportedHandler<Env>;
