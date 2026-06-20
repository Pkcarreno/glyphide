import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingLayer } from "./FloatingLayer.tsx";

const [mockIsOpenSettings, setMockIsOpenSettings] = createSignal(false);
const [mockIsOpenEngineSettings, setMockIsOpenEngineSettings] =
  createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    settings: {
      settings: {
        theme: "system",
        isWordWrapEnabled: false,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true,
      },
      updateSettings: vi.fn(),
    },
    dispatcher: { dispatch: vi.fn() },
    overlays: {
      isOpen: (id: string) =>
        (id === "settings" && mockIsOpenSettings()) ||
        (id === "engine-settings" && mockIsOpenEngineSettings()),
    },
    engine: {
      activeEngineId: () => "mock-engine",
      activeInitParams: () => ({ timeout: 1000 }),
      engineStatus: () => "ready",
    },
    engineRegistry: {
      getDefinition: () => ({
        paramDescriptors: [
          {
            key: "timeout",
            label: "Timeout (s)",
            isEditable: true,
            inputType: "compact-number",
            inputProps: { min: 1, max: 120, step: 1 },
            toModel: (val: unknown) => Number(val) * 1000,
            toView: (val: unknown) => Number(val) / 1000,
          },
        ],
        defaultInitParams: {},
      }),
    },
    project: {
      name: () => "TestProject",
    },
    notifications: {
      unreadCount: () => 0,
      items: () => [],
      activeToasts: () => [],
    },
  }),
}));

describe("FloatingLayer", () => {
  beforeEach(() => {
    setMockIsOpenSettings(false);
    setMockIsOpenEngineSettings(false);
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
});
