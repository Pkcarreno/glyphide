import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaProvider, usePwaUpdate } from "./pwa-registration.tsx";

const updateServiceWorkerMock = vi.fn();
const [mockNeedRefresh, setMockNeedRefresh] = createSignal(false);

vi.mock("virtual:pwa-register/solid", () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh, setMockNeedRefresh],
    updateServiceWorker: updateServiceWorkerMock,
  }),
}));

interface SpyHost {
  applyUpdate: () => void;
  isUpdateAvailable: () => boolean;
}

function SpyConsumer(props: { setHost: (host: SpyHost) => void }) {
  const pwa = usePwaUpdate();
  props.setHost({
    applyUpdate: () => pwa.applyUpdate(),
    isUpdateAvailable: () => pwa.updateAvailable(),
  });
  return <div data-testid="consumer">Consumer Active</div>;
}

describe("PwaProvider & usePwaUpdate", () => {
  let host: SpyHost | undefined;

  beforeEach(() => {
    host = undefined;
    setMockNeedRefresh(false);
    updateServiceWorkerMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("usePwaUpdate provides safe fallback when called outside PwaProvider", () => {
    render(() => (
      <SpyConsumer
        setHost={(h) => {
          host = h;
        }}
      />
    ));

    expect(host?.isUpdateAvailable()).toBe(false);
    expect(() => host?.applyUpdate()).not.toThrow();
  });

  it("mounts PwaProvider and renders children", () => {
    const { getByTestId } = render(() => (
      <PwaProvider>
        <SpyConsumer
          setHost={(h) => {
            host = h;
          }}
        />
      </PwaProvider>
    ));

    expect(getByTestId("consumer")).toBeTruthy();
  });

  it("does not set updateAvailable when needRefresh is initially false", () => {
    render(() => (
      <PwaProvider>
        <SpyConsumer
          setHost={(h) => {
            host = h;
          }}
        />
      </PwaProvider>
    ));

    expect(host?.isUpdateAvailable()).toBe(false);
  });

  it("sets updateAvailable to true when needRefresh becomes true", async () => {
    render(() => (
      <PwaProvider>
        <SpyConsumer
          setHost={(h) => {
            host = h;
          }}
        />
      </PwaProvider>
    ));

    setMockNeedRefresh(true);

    await waitFor(() => {
      expect(host?.isUpdateAvailable()).toBe(true);
    });
  });

  it("does not re-trigger when needRefresh toggles", async () => {
    render(() => (
      <PwaProvider>
        <SpyConsumer
          setHost={(h) => {
            host = h;
          }}
        />
      </PwaProvider>
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

  it("wires applyUpdate to updateServiceWorker from virtual module", () => {
    render(() => (
      <PwaProvider>
        <SpyConsumer
          setHost={(h) => {
            host = h;
          }}
        />
      </PwaProvider>
    ));

    expect(host).toBeDefined();
    host?.applyUpdate();
    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
  });
});
