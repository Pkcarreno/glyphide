import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import type { UrlStatePort } from "../ports/url-state.ts";

/**
 * Per-session trust gate that blocks engine initialization and code execution
 * when the buffer loads shared code from a URL parameter.
 */
export interface TrustModel {
  /** Grants trust session-wide, deactivating the trust gate. */
  grantTrust: () => void;
  /** Whether trust is currently required (shared code detected, not yet granted). */
  isTrustRequired: Accessor<boolean>;
  /**
   * Re-arms the trust gate. Used by file loads so that file-loaded
   * code requires the same user acknowledgment as URL-shared code.
   */
  markTrustRequired: () => void;
  /** The shared code value from the URL, or null if none was present. */
  sharedCode: Accessor<string | null>;
}

/**
 * Creates a TrustModel that reads the URL `code` parameter synchronously.
 * When shared code is detected, trust is required until explicitly granted.
 */
export function createTrustModel(urlState: UrlStatePort): TrustModel {
  const codeValue = urlState.get("code");
  const hasSharedCode = typeof codeValue === "string" && codeValue !== "";

  const [isTrustRequired, setIsTrustRequired] = createSignal(hasSharedCode);
  const [sharedCode] = createSignal<string | null>(codeValue || null);

  function grantTrust(): void {
    if (isTrustRequired()) {
      setIsTrustRequired(false);
    }
  }

  function markTrustRequired(): void {
    if (!isTrustRequired()) {
      setIsTrustRequired(true);
    }
  }

  return {
    grantTrust,
    isTrustRequired,
    markTrustRequired,
    sharedCode,
  };
}
