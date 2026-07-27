import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingLayer } from "./FloatingLayer.tsx";

const [mockIsOpenSettings, setMockIsOpenSettings] = createSignal(false);
const [mockIsOpenEngineSettings, setMockIsOpenEngineSettings] =
  createSignal(false);
const [mockIsOpenTrustRequired, setMockIsOpenTrustRequired] =
  createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: vi.fn() },
    engine: {
      activeEngineId: () => "mock-engine",
      activeInitParams: () => ({ timeout: 1000 }),
      engineStatus: () => "ready",
    },
    engineRegistry: {
      getDefinition: () => ({
        defaultInitParams: {},
        paramDescriptors: [
          {
            inputProps: { max: 120, min: 1, step: 1 },
            inputType: "compact-number",
            isEditable: true,
            key: "timeout",
            label: "Timeout (s)",
            toModel: (val: unknown) => Number(val) * 1000,
            toView: (val: unknown) => Number(val) / 1000,
          },
        ],
      }),
    },
    notifications: {
      activeToasts: () => [],
      items: () => [],
      unreadCount: () => 0,
    },
    overlays: {
      isOpen: (id: string) =>
        (id === "settings" && mockIsOpenSettings()) ||
        (id === "engine-settings" && mockIsOpenEngineSettings()) ||
        (id === "trust-required" && mockIsOpenTrustRequired()),
    },
    project: {
      name: () => "TestProject",
    },
    settings: {
      settings: {
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true,
        isWordWrapEnabled: false,
        theme: "system",
      },
      updateSettings: vi.fn(),
    },
  }),
}));

describe("FloatingLayer", () => {
  beforeEach(() => {
    setMockIsOpenSettings(false);
    setMockIsOpenEngineSettings(false);
    setMockIsOpenTrustRequired(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("when rendered and all overlays are closed, no dialogs are in the DOM", () => {
    const { queryAllByRole } = render(() => <FloatingLayer />);
    expect(queryAllByRole("dialog")).toHaveLength(0);
  });

  it("when settings overlay is open, displays SettingsModal with Settings title", () => {
    setMockIsOpenSettings(true);
    const { getByRole, getByText } = render(() => <FloatingLayer />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
  });

  it("when engine-settings overlay is open, displays EngineSettingsModal with Engine Settings title", () => {
    setMockIsOpenEngineSettings(true);
    const { getByRole, getByText } = render(() => <FloatingLayer />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Engine Settings")).toBeTruthy();
  });

  it("when trust-required overlay is open, displays TrustRequiredModal with Trust Required title", () => {
    setMockIsOpenTrustRequired(true);
    const { getByRole, getByText } = render(() => <FloatingLayer />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Trust Required")).toBeTruthy();
  });
});
