import quickJsNgWasmVariant from "@jitl/quickjs-ng-wasmfile-release-sync";
import { loadQuickJs as _loadQuickJsFromSebastianWessel } from "@sebastianwessel/quickjs";

export type {
  ErrorResponse,
  OkResponse,
  SandboxFunction,
  SandboxOptions,
} from "@sebastianwessel/quickjs";

async function loadQuickJs(): Promise<
  ReturnType<typeof _loadQuickJsFromSebastianWessel>
> {
  try {
    const quickJsInstance =
      await _loadQuickJsFromSebastianWessel(quickJsNgWasmVariant);
    return quickJsInstance;
  } catch (error) {
    console.error(
      "[@glyphide/quickjs] Error while loading QuickJS in loadQuickJs():",
      error
    );
    throw error;
  }
}

export { loadQuickJs };
