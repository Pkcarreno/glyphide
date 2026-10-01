import type { Accessor } from "solid-js";
import { batch, createSignal } from "solid-js";
import type { EngineId, EngineRegistry } from "../engine/registry.ts";
import type { UrlPersistencePort } from "../ports/url-persistence.ts";

const DEFAULT_PROJECT_NAME = "untitled_project";
const DEFAULT_ENGINE_ID: EngineId = "quickjs";

const SUPPORTED_FILE_EXTENSIONS = [".js", ".py"] as const;

/** Strips a supported file extension from a filename. */
function stripExtension(filename: string): string {
  const lowerFilename = filename.toLowerCase();
  for (const ext of SUPPORTED_FILE_EXTENSIONS) {
    if (lowerFilename.endsWith(ext)) {
      return filename.slice(0, -ext.length);
    }
  }
  return filename;
}

/**
 * Resolves the engine ID from an engine string and registry.
 * Falls back to default 'quickjs' if unknown or absent.
 */
function resolveInitialEngine(
  engineString: string | undefined,
  registry: EngineRegistry
): { engineId: EngineId; language: string } {
  if (!engineString) {
    const def = registry.getDefinition(DEFAULT_ENGINE_ID);
    return { engineId: DEFAULT_ENGINE_ID, language: def.supportedLanguages[0] };
  }

  const [rawId, rawLang] = engineString.split(":");
  const candidateId = rawId as EngineId;

  try {
    const def = registry.getDefinition(candidateId);
    const language =
      rawLang && def.supportedLanguages.includes(rawLang)
        ? rawLang
        : def.supportedLanguages[0];
    return { engineId: candidateId, language };
  } catch {
    const def = registry.getDefinition(DEFAULT_ENGINE_ID);
    return { engineId: DEFAULT_ENGINE_ID, language: def.supportedLanguages[0] };
  }
}

/** Resolves the default curated snippet for an engine. */
function resolveDefaultCode(
  engineId: EngineId,
  registry: EngineRegistry
): string {
  try {
    return registry.getDefinition(engineId).defaultBufferCode ?? "";
  } catch {
    return "";
  }
}

/**
 * Options accepted by `setCode`.
 * @public
 */
export interface SetCodeOptions {
  /**
   * Source of the content update.
   * - "default": arms the pristine flag so engine switches can swap the snippet.
   * - "user": disarms the pristine flag.
   */
  source?: "default" | "user";
}

/**
 * File descriptor accepted by `loadFile`.
 * @public
 */
export interface LoadFilePayload {
  content: string;
  engineId: EngineId;
  language?: string;
  name: string;
}

/**
 * Deep aggregate model for the workspace session.
 * Manages document code, cursor position, project metadata,
 * active engine identity, trust state, and atomic URL persistence.
 * @public
 */
export interface WorkspaceSession {
  /** Reactive accessor for current engine ID. */
  activeEngineId: Accessor<EngineId>;
  /** Reactive accessor for current engine language. */
  activeLanguage: Accessor<string>;
  /** Reactive accessor for the current code buffer content. */
  code: Accessor<string>;
  /** Reactive accessor for the cursor and selection position. */
  cursorPosition: Accessor<{
    column: number;
    line: number;
    selectionLength: number;
    selectionLines: number;
  }>;
  /** Reactive accessor for user-facing project display name. */
  displayName: Accessor<string>;
  /** Grants trust session-wide, deactivating the trust gate. */
  grantTrust: () => void;
  /**
   * Indicates whether the buffer is currently displaying an untouched default snippet.
   */
  isShowingDefaultCode: Accessor<boolean>;
  /** Indicates whether the session is blocked by untrusted code. */
  isTrustRequired: Accessor<boolean>;
  /** Indicates whether the session state fits within URL length limits. */
  isUrlShareable: Accessor<boolean>;
  /**
   * Loads code from an external file, updating code, project name,
   * active engine, and re-arming the trust gate.
   */
  loadFile: (payload: LoadFilePayload) => void;
  /** Re-arms the trust gate to block execution until acknowledged. */
  markTrustRequired: () => void;
  /** Reactive accessor for internal project name. */
  projectName: Accessor<string>;
  /** Resets the session to default state and clears URL parameters. */
  reset: () => void;
  /** Switches active engine, swapping code if buffer is pristine. */
  selectEngine: (engineId: EngineId, language?: string) => void;
  /** Replaces buffer content and synchronizes URL. */
  setCode: (newCode: string, options?: SetCodeOptions) => void;
  /** Updates the cursor position and selection dimensions. */
  setCursorPosition: (
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ) => void;
  /** Updates project name and syncs with URL. */
  setProjectName: (newName: string) => void;
  /** Updates whether the project URL is shareable. */
  setShareableState: (isShareable: boolean) => void;
  /** Shared code detected in URL on startup, or null. */
  sharedCode: Accessor<string | null>;
}

/** Dependencies required to initialize a WorkspaceSession. */
export interface WorkspaceSessionDeps {
  engineRegistry: EngineRegistry;
  isDefaultCodeEnabled: () => boolean;
  urlPersistence: UrlPersistencePort;
}

/**
 * Creates a new `WorkspaceSession` deep model.
 */
export function createWorkspaceSession(
  deps: WorkspaceSessionDeps
): WorkspaceSession {
  const initialCanonical = deps.urlPersistence.load();
  const hasSharedUrlCode =
    typeof initialCanonical?.code === "string" &&
    initialCanonical.code.length > 0;

  let initialEngineString: string | undefined;
  if (initialCanonical?.engine) {
    initialEngineString = initialCanonical.language
      ? `${initialCanonical.engine}:${initialCanonical.language}`
      : initialCanonical.engine;
  }

  const initialEngine = resolveInitialEngine(
    initialEngineString,
    deps.engineRegistry
  );

  let startCode = "";
  let startIsPristine = false;

  if (hasSharedUrlCode) {
    startCode = initialCanonical?.code ?? "";
    startIsPristine = false;
  } else if (deps.isDefaultCodeEnabled()) {
    startCode = resolveDefaultCode(initialEngine.engineId, deps.engineRegistry);
    startIsPristine = startCode.length > 0;
  }

  const [code, setCodeSignal] = createSignal<string>(startCode);
  const [cursorPosition, setCursorPositionSignal] = createSignal({
    column: 1,
    line: 1,
    selectionLength: 0,
    selectionLines: 0,
  });
  const [projectName, setProjectNameSignal] = createSignal<string>(
    initialCanonical?.name?.trim() || DEFAULT_PROJECT_NAME
  );
  const [isUrlShareable, setIsUrlShareable] = createSignal<boolean>(true);
  const [activeEngineId, setActiveEngineId] = createSignal<EngineId>(
    initialEngine.engineId
  );
  const [activeLanguage, setActiveLanguage] = createSignal<string>(
    initialEngine.language
  );
  const [isTrustRequired, setIsTrustRequired] =
    createSignal<boolean>(hasSharedUrlCode);
  const [sharedCode] = createSignal<string | null>(
    hasSharedUrlCode ? (initialCanonical?.code ?? null) : null
  );
  const [isShowingDefaultCode, setIsShowingDefaultCode] =
    createSignal<boolean>(startIsPristine);

  const displayName = () =>
    projectName() === DEFAULT_PROJECT_NAME ? "Untitled" : projectName();

  function persistToUrl(
    currentCode: string,
    currentEngineId: EngineId,
    currentLang: string,
    currentProjectName: string,
    isPristine: boolean
  ): void {
    if (isPristine || currentCode.trim() === "") {
      deps.urlPersistence.clear();
      setIsUrlShareable(true);
      return;
    }

    const { isShareable } = deps.urlPersistence.save({
      code: currentCode,
      engine: currentEngineId,
      language: currentLang,
      name:
        currentProjectName === DEFAULT_PROJECT_NAME ? "" : currentProjectName,
    });
    setIsUrlShareable(isShareable);
  }

  function setCode(newCode: string, options: SetCodeOptions = {}): void {
    const source = options.source ?? "user";
    const isDefaultSource = source === "default" && newCode.length > 0;
    batch(() => {
      setCodeSignal(newCode);
      setIsShowingDefaultCode(isDefaultSource);
      persistToUrl(
        newCode,
        activeEngineId(),
        activeLanguage(),
        projectName(),
        isDefaultSource
      );
    });
  }

  function setCursorPosition(
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ): void {
    setCursorPositionSignal({ column, line, selectionLength, selectionLines });
  }

  function setProjectName(newName: string): void {
    const sanitized = newName.trim() || DEFAULT_PROJECT_NAME;
    batch(() => {
      setProjectNameSignal(sanitized);
      persistToUrl(
        code(),
        activeEngineId(),
        activeLanguage(),
        sanitized,
        isShowingDefaultCode()
      );
    });
  }

  function setShareableState(isShareable: boolean): void {
    setIsUrlShareable(isShareable);
  }

  function selectEngine(newEngineId: EngineId, newLanguage?: string): void {
    const def = deps.engineRegistry.getDefinition(newEngineId);
    const resolvedLang =
      newLanguage && def.supportedLanguages.includes(newLanguage)
        ? newLanguage
        : def.supportedLanguages[0];

    batch(() => {
      setActiveEngineId(newEngineId);
      setActiveLanguage(resolvedLang);

      let currentCode = code();
      let pristine = isShowingDefaultCode();

      // Pristine buffer rule: replace code with the new engine default if untouched
      if (pristine) {
        currentCode = resolveDefaultCode(newEngineId, deps.engineRegistry);
        setCodeSignal(currentCode);
        pristine = currentCode.length > 0;
        setIsShowingDefaultCode(pristine);
      }

      persistToUrl(
        currentCode,
        newEngineId,
        resolvedLang,
        projectName(),
        pristine
      );
    });
  }

  function reset(): void {
    batch(() => {
      deps.urlPersistence.clear();
      setIsUrlShareable(true);

      const resetContent = deps.isDefaultCodeEnabled()
        ? resolveDefaultCode(activeEngineId(), deps.engineRegistry)
        : "";

      setCodeSignal(resetContent);
      setIsShowingDefaultCode(resetContent.length > 0);
      setCursorPositionSignal({
        column: 1,
        line: 1,
        selectionLength: 0,
        selectionLines: 0,
      });
      setProjectNameSignal(DEFAULT_PROJECT_NAME);
      setIsTrustRequired(false);
    });
  }

  function loadFile(payload: LoadFilePayload): void {
    const baseName = stripExtension(payload.name);
    const def = deps.engineRegistry.getDefinition(payload.engineId);
    const lang =
      payload.language && def.supportedLanguages.includes(payload.language)
        ? payload.language
        : def.supportedLanguages[0];
    const newName = baseName || DEFAULT_PROJECT_NAME;

    batch(() => {
      setCodeSignal(payload.content);
      setIsShowingDefaultCode(false);
      setProjectNameSignal(newName);
      setActiveEngineId(payload.engineId);
      setActiveLanguage(lang);
      setIsTrustRequired(true);

      persistToUrl(payload.content, payload.engineId, lang, newName, false);
    });
  }

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
    activeEngineId,
    activeLanguage,
    code,
    cursorPosition,
    displayName,
    grantTrust,
    isShowingDefaultCode,
    isTrustRequired,
    isUrlShareable,
    loadFile,
    markTrustRequired,
    projectName,
    reset,
    selectEngine,
    setCode,
    setCursorPosition,
    setProjectName,
    setShareableState,
    sharedCode,
  };
}
