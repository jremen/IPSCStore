import type { SSEStreamingApi } from 'hono/streaming';

/**
 * Simple typed SSE event. Any component that emits events must keep the
 * `type`/`payload` contract in sync with frontend/src/services/sse.ts.
 */
export interface ServerEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
}

interface ClientConnection {
  matchId: string | null;
  stream: SSEStreamingApi;
}

/**
 * In-memory broadcast hub for Server-Sent Events.
 *
 * The main application creates one singleton per process. All active SSE
 * clients are registered here; code paths that mutate shared match state
 * (e.g. scoring saves) can call `broadcast()` to push updates in real time.
 */
export class EventBroadcaster {
  private clients = new Set<ClientConnection>();

  add(matchId: string | null, stream: SSEStreamingApi): void {
    const conn: ClientConnection = { matchId, stream };
    this.clients.add(conn);
    console.log('[SSE] client connected', { matchId, total: this.clients.size });

    stream.onAbort(() => {
      console.log('[SSE] client disconnected', { matchId, total: this.clients.size - 1 });
      this.clients.delete(conn);
    });
  }

  broadcast(event: ServerEvent): void {
    console.log('[SSE] broadcasting', event.type, event.payload, 'to', this.clients.size, 'clients');
    for (const conn of this.clients) {
      // When client specifies a matchId, only send events for that match
      if (conn.matchId && event.payload && (event.payload as any).matchId !== conn.matchId) {
        continue;
      }
      this.write(conn.stream, event);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private write(stream: SSEStreamingApi, event: ServerEvent): void {
    if (stream.aborted) return;
    // Use Hono's typed writeSSE so the browser gets the correct event name.
    stream.writeSSE({
      event: event.type,
      data: JSON.stringify(event.payload),
    }).catch(() => {
      // Client disconnected; cleanup will be handled by abort listener
    });
  }
}

export const eventBroadcaster = new EventBroadcaster();
