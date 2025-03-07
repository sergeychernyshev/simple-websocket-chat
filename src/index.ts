export { MyDurableObject } from "./do";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

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
		console.log(url);

		const doId: DurableObjectId = env.MY_DURABLE_OBJECT.idFromName("do");
		const myDO = env.MY_DURABLE_OBJECT.get(doId);


		if (url.pathname === '/writeMessage') {
			const message = url.searchParams.get('message');

			if (message) {
				myDO.writeMessage(message);
			}

			return new Response("Message recieved");
		} if (url.pathname === '/') {
			const messages = await myDO.getAllMessages();

			return new Response(messages.join("\n"));
		} else {
			return new Response(null, { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
