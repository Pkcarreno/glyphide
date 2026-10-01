import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditor } from "../core/context.tsx";
import { PwaRegistration } from "./pwa-registration.tsx";

const updateServiceWorkerMock = vi.fn();
const [mockNeedRefresh, setMockNeedRefresh] = createSignal(false);
const [mockOfflineReady, setMockOfflineReady] = createSignal(false);

vi.mock("virtual:pwa-register/solid", () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh, setMockNeedRefresh],
    offlineReady: [mockOfflineReady, setMockOfflineReady],
    updateServiceWorker: updateServiceWorkerMock,
  }),
}));

interface SpyHost {
  applyUpdate: () => void;
  isOfflineReady: () => boolean;
  isUpdateAvailable: () => boolean;
}

function SpyHost(props: { setHost: (host: SpyHost) => void }) {
  const core = useEditor();
  props.setHost({
    applyUpdate: () => core.pwa.applyUpdate(),
    isOfflineReady: () => core.pwa.offlineReady(),
    isUpdateAvailable: () => core.pwa.updateAvailable(),
  });
  return null;
}

describe("PwaRegistration", () => {
  let host: SpyHost | undefined;

  beforeEach(() => {
    host = undefined;
    setMockNeedRefresh(false);
    setMockOfflineReady(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("mounts inside EditorProvider and renders nothing", () => {
    const { container } = render(() => (
      <EditorProvider>
        <SpyHost
          setHost={(h) => {
            host = h;
          }}
        />
        <PwaRegistration />
      </EditorProvider>
    ));

    expect(container.innerHTML).toBe("");
  });

  it("does not set updateAvailable when needRefresh is initially false", () => {
    render(() => (
      <EditorProvider>
        <SpyHost
          setHost={(h) => {
            host = h;
          }}
        />
        <PwaRegistration />
      </EditorProvider>
    ));

    expect(host?.isUpdateAvailable()).toBe(false);
  });

  it("sets updateAvailable to true when needRefresh becomes true", async () => {
    render(() => (
      <EditorProvider>
        <SpyHost
          setHost={(h) => {
            host = h;
          }}
        />
        <PwaRegistration />
      </EditorProvider>
    ));

    setMockNeedRefresh(true);

    await waitFor(() => {
      expect(host?.isUpdateAvailable()).toBe(true);
    });
  });

  it("sets offlineReady to true when offlineReady becomes true", async () => {
    render(() => (
      <EditorProvider>
        <SpyHost
          setHost={(h) => {
            host = h;
          }}
        />
        <PwaRegistration />
      </EditorProvider>
    ));

    setMockOfflineReady(true);

    await waitFor(() => {
      expect(host?.isOfflineReady()).toBe(true);
    });
  });

  it("does not re-trigger when needRefresh toggles (effect re-runs but flag is set)", async () => {
    render(() => (
      <EditorProvider>
        <SpyHost
          setHost={(h) => {
            host = h;
          }}
        />
        <PwaRegistration />
      </EditorProvider>
    ));

    setMockNeedRefresh(true);

    await waitFor(() => {
      expect(host?.isUpdateAvailable()).toBe(true);
    });

    setMockNeedRefresh(false);
    setMockNeedRefresh(true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host?.isUpdateAvailable()).toBe(true);
  });

  it("wires applyUpdate to updateServiceWorker from the virtual module", () => {
    render(() => (
      <EditorProvider>
        <SpyHost
          setHost={(h) => {
            host = h;
          }}
        />
        <PwaRegistration />
      </EditorProvider>
    ));

    expect(host).toBeDefined();
    host?.applyUpdate();
    expect(updateServiceWorkerMock).toHaveBeenCalled();
  });
});
