import { DurableObject } from "cloudflare:workers";

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject<Env> {
	sql: SqlStorage;

	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS messages (
				id		INTEGER PRIMARY KEY,
				message	TEXT
			);
		`);
	}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param name - The name provided to a Durable Object instance from a Worker
	 * @returns The greeting to be sent back to the Worker
	 */
	async getAllMessages(): Promise<string[]> {
		let results = this.sql.exec("SELECT * FROM messages").toArray();

		return results?.map(result => result.message ? result.message.toString() : '');
	}

	async writeMessage(message: String): Promise<boolean> {
		const result2 = this.sql.exec(`INSERT INTO messages (message) VALUES (?)`, message);

		console.log(result2);

		return true;
	}
}
