/**
 * Agnostic transport seam and concrete adapters for RPC messaging.
 * Decouples the orchestrator from browser DOM Worker APIs.
 */

import type { EngineOutputPayload } from "@glyphide/rpc-protocol/types";
import type { DirectTransportAdapter } from "./direct-transport.ts";
import { DirectTransport } from "./direct-transport.ts";
import { WorkerTransport } from "./worker-transport.ts";

export {
  DirectTransport,
  type DirectTransportAdapter,
} from "./direct-transport.ts";
export { WorkerTransport } from "./worker-transport.ts";

/**
 * Event wrapper for incoming transport messages.
 *
 * @public
 */
export interface RpcTransportMessageEvent {
  data: unknown;
}

/**
 * Callback handler invoked when a transport receives a message.
 *
 * @public
 */
export type RpcTransportMessageHandler = (
  event: RpcTransportMessageEvent
) => void;

/**
 * Agnostic bidirectional message transport contract.
 *
 * @public
 */
export interface RpcTransport {
  /**
   * Message handler invoked when a message is received from the peer.
   */
  onMessage: RpcTransportMessageHandler | null;

  /**
   * Dispatches an outgoing message to the peer.
   */
  postMessage: (message: unknown) => void;

  /**
   * Optional cleanup callback to terminate or dispose transport resources.
   */
  terminate?: () => void;
}

/**
 * Creates an in-process DirectTransport wrapping an EngineAdapter.
 *
 * @public
 */
export function createDirectTransport(
  adapter: DirectTransportAdapter
): DirectTransport {
  return new DirectTransport(adapter);
}

/**
 * Creates a WorkerTransport wrapping a native browser Worker.
 *
 * @public
 */
export function createWorkerTransport(worker: Worker): WorkerTransport {
  return new WorkerTransport(worker);
}

/**
 * Normalizes either an existing RpcTransport or a DOM Worker into an RpcTransport.
 *
 * @public
 */
export function toRpcTransport(target: RpcTransport | Worker): RpcTransport {
  if ("onMessage" in target) {
    return target as RpcTransport;
  }
  return createWorkerTransport(target as Worker);
}

/**
 * Phantom-typed transport factory.
 * Carries the engine output payload shape without adding runtime overhead.
 *
 * @public
 */
export type EngineTransportFactory<
  TPayload extends EngineOutputPayload = EngineOutputPayload,
> = (() => RpcTransport) & {
  readonly _payloadType?: TPayload;
};
