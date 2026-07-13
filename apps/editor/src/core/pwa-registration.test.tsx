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

interface DispatchSpyHost {
  applyUpdate: () => void;
  dispatch: ReturnType<typeof vi.fn>;
}

function DispatchSpyHost(props: { setHost: (host: DispatchSpyHost) => void }) {
  const core = useEditor();
  const dispatchSpy = vi.spyOn(core.dispatcher, "dispatch");
  props.setHost({
    dispatch: dispatchSpy,
    applyUpdate: () => core.pwa.applyUpdate(),
  });
  return null;
}

describe("PwaRegistration", () => {
  let host: DispatchSpyHost | undefined;

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
        <DispatchSpyHost setHost={(h) => (host = h)} />
        <PwaRegistration />
      </EditorProvider>
    ));

    // PwaRegistration returns null; nothing should be added to the container
    // beyond what EditorProvider itself does (which is also nothing in this subtree).
    expect(container.innerHTML).toBe("");
  });

  it("does not dispatch PWA_UPDATE_AVAILABLE when needRefresh is initially false", () => {
    render(() => (
      <EditorProvider>
        <DispatchSpyHost setHost={(h) => (host = h)} />
        <PwaRegistration />
      </EditorProvider>
    ));

    const updateCalls = (host?.dispatch.mock.calls ?? []).filter(
      ([arg]) => (arg as { type: string }).type === "PWA_UPDATE_AVAILABLE"
    );
    expect(updateCalls).toHaveLength(0);
  });

  it("dispatches PWA_UPDATE_AVAILABLE exactly once when needRefresh becomes true", async () => {
    render(() => (
      <EditorProvider>
        <DispatchSpyHost setHost={(h) => (host = h)} />
        <PwaRegistration />
      </EditorProvider>
    ));

    setMockNeedRefresh(true);

    await waitFor(() => {
      const updateCalls = (host?.dispatch.mock.calls ?? []).filter(
        ([arg]) => (arg as { type: string }).type === "PWA_UPDATE_AVAILABLE"
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    const updateCalls = (host?.dispatch.mock.calls ?? []).filter(
      ([arg]) => (arg as { type: string }).type === "PWA_UPDATE_AVAILABLE"
    );
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]?.[0]).toEqual({ type: "PWA_UPDATE_AVAILABLE" });
  });

  it("dispatches PWA_OFFLINE_READY exactly once when offlineReady becomes true", async () => {
    render(() => (
      <EditorProvider>
        <DispatchSpyHost setHost={(h) => (host = h)} />
        <PwaRegistration />
      </EditorProvider>
    ));

    setMockOfflineReady(true);

    await waitFor(() => {
      const offlineCalls = (host?.dispatch.mock.calls ?? []).filter(
        ([arg]) => (arg as { type: string }).type === "PWA_OFFLINE_READY"
      );
      expect(offlineCalls.length).toBeGreaterThan(0);
    });

    const offlineCalls = (host?.dispatch.mock.calls ?? []).filter(
      ([arg]) => (arg as { type: string }).type === "PWA_OFFLINE_READY"
    );
    expect(offlineCalls).toHaveLength(1);
    expect(offlineCalls[0]?.[0]).toEqual({ type: "PWA_OFFLINE_READY" });
  });

  it("does not re-dispatch when needRefresh toggles (effect re-runs but flag is set)", async () => {
    render(() => (
      <EditorProvider>
        <DispatchSpyHost setHost={(h) => (host = h)} />
        <PwaRegistration />
      </EditorProvider>
    ));

    setMockNeedRefresh(true);

    await waitFor(() => {
      const updateCalls = (host?.dispatch.mock.calls ?? []).filter(
        ([arg]) => (arg as { type: string }).type === "PWA_UPDATE_AVAILABLE"
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    // Toggle needRefresh off and back on — effect re-runs, but the
    // dispatched flag is already set, so no new dispatch.
    setMockNeedRefresh(false);
    setMockNeedRefresh(true);

    // Give the effect a microtask to settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    const updateCalls = (host?.dispatch.mock.calls ?? []).filter(
      ([arg]) => (arg as { type: string }).type === "PWA_UPDATE_AVAILABLE"
    );
    expect(updateCalls).toHaveLength(1);
  });

  it("wires applyUpdate to updateServiceWorker from the virtual module", () => {
    render(() => (
      <EditorProvider>
        <DispatchSpyHost setHost={(h) => (host = h)} />
        <PwaRegistration />
      </EditorProvider>
    ));

    // PwaRegistration has rebound core.pwa.applyUpdate to call
    // updateServiceWorker. The host reads it AFTER mount, so the
    // rebound function is the one captured.
    expect(host).toBeDefined();
    host?.applyUpdate();
    expect(updateServiceWorkerMock).toHaveBeenCalled();
  });
});
