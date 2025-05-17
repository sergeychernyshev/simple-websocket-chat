import { DurableObject } from 'cloudflare:workers';

export type ConnectedMessage = {
  connected: boolean;
};

export type ClearChatMessage = {
  clear: boolean;
};

export type FullChatMessage = {
  chat: string[];
};

export type SingleChatMessage = {
  message: string;
};

export type EmptyMessage = {};

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject<Env> {
  sql: SqlStorage;
  tableExists: boolean = false;

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

    if (!this.tableExists) {
      const result = this.sql.exec(`
				CREATE TABLE IF NOT EXISTS messages (
					id		INTEGER PRIMARY KEY AUTOINCREMENT,
					message	TEXT
				);
			`);

      this.tableExists = true;

      console.log('CREATE TABLE result: ', result);
    }
  }

  /**
   * Web Socket server for updates and stuff
   *
   * @param request
   * @returns
   */
  async fetch(request: Request): Promise<Response> {
    // Creates two ends of a WebSocket connection.
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
    // request within the Durable Object. It has the effect of "accepting" the connection,
    // and allowing the WebSocket to send and receive messages.
    // Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
    // is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
    // the connection is open. During periods of inactivity, the Durable Object can be evicted
    // from memory, but the WebSocket connection will remain open. If at some later point the
    // WebSocket receives a message, the runtime will recreate the Durable Object
    // (run the `constructor`) and deliver the message to the appropriate handler.
    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, messageString: ArrayBuffer | string) {
    console.log('got a message:', messageString);

    let messageObject: ConnectedMessage | FullChatMessage | SingleChatMessage | EmptyMessage = {};

    try {
      messageObject = JSON.parse(messageString.toString());
    } catch {
      console.log('Cound not parse message:', messageString);
    }

    console.log('parsed message:', messageObject);

    const sockets = this.ctx.getWebSockets();
    // console.log(sockets);

    if (messageObject.hasOwnProperty('connected')) {
      let results = this.sql.exec('SELECT * FROM messages').toArray();

      const fullChatMessage: FullChatMessage = {
        chat: results?.map((result) => (result.message ? result.message.toString() : '')),
      };

      ws.send(JSON.stringify(fullChatMessage));
    } else if (messageObject.hasOwnProperty('clear')) {
      this.sql.exec('DELETE FROM messages');

      const fullChatMessage: FullChatMessage = {
        chat: [],
      };

      sockets.forEach((ws) => {
        try {
          ws.send(JSON.stringify(fullChatMessage));
        } catch (err) {
          console.log('could not send messages to:', ws);
        }
      });
    } else if (messageObject.hasOwnProperty('message')) {
      const result = this.sql.exec(`INSERT INTO messages (message) VALUES (?)`, messageObject.message);

      sockets.forEach((ws) => {
        try {
          ws.send(messageString);
        } catch (err) {
          console.log('could not send messages to:', ws);
        }
      });
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // If the client closes the connection, the runtime will invoke the webSocketClose() handler.
    ws.close(code, 'Durable Object is closing WebSocket');
  }
}
