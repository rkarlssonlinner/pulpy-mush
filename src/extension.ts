import * as vscode from "vscode";

let focusModeActive = false;
let dimDecorationType: vscode.TextEditorDecorationType | undefined;
let disposables: vscode.Disposable[] = [];
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "pulpyMush.toggleFocusMode";
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const toggleCmd = vscode.commands.registerCommand(
    "pulpyMush.toggleFocusMode",
    () => {
      focusModeActive = !focusModeActive;
      updateStatusBar();

      if (focusModeActive) {
        enableFocusMode();
      } else {
        disableFocusMode();
      }
    }
  );

  context.subscriptions.push(toggleCmd);
}

function updateStatusBar() {
  if (focusModeActive) {
    statusBarItem.text = "$(eye-closed) Focus";
    statusBarItem.tooltip = "Focus Mode ON — click to disable";
  } else {
    statusBarItem.text = "$(eye) Focus";
    statusBarItem.tooltip = "Focus Mode OFF — click to enable";
  }
}

function getOpacity(): number {
  return vscode.workspace
    .getConfiguration("pulpyMush")
    .get<number>("dimOpacity", 0.35);
}

function createDimDecoration(): vscode.TextEditorDecorationType {
  const opacity = getOpacity();
  return vscode.window.createTextEditorDecorationType({
    opacity: `${opacity}`,
    isWholeLine: true,
  });
}

function enableFocusMode() {
  dimDecorationType = createDimDecoration();

  applyDimming();

  // Re-apply whenever the active editor changes
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      applyDimming();
    })
  );

  // Re-apply when visible editors change (splits open/close)
  disposables.push(
    vscode.window.onDidChangeVisibleTextEditors(() => {
      applyDimming();
    })
  );

  // Re-apply when config changes
  disposables.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("pulpyMush.dimOpacity")) {
        // Recreate decoration type with new opacity
        dimDecorationType?.dispose();
        dimDecorationType = createDimDecoration();
        applyDimming();
      }
    })
  );
}

function applyDimming() {
  if (!dimDecorationType) {
    return;
  }

  const activeEditor = vscode.window.activeTextEditor;

  for (const editor of vscode.window.visibleTextEditors) {
    if (editor === activeEditor) {
      // Clear dimming on the focused editor
      editor.setDecorations(dimDecorationType, []);
    } else {
      // Dim the entire document
      const fullRange = new vscode.Range(
        0,
        0,
        editor.document.lineCount,
        0
      );
      editor.setDecorations(dimDecorationType, [fullRange]);
    }
  }
}

function disableFocusMode() {
  // Clear all decorations
  if (dimDecorationType) {
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(dimDecorationType, []);
    }
    dimDecorationType.dispose();
    dimDecorationType = undefined;
  }

  // Dispose all event listeners
  for (const d of disposables) {
    d.dispose();
  }
  disposables = [];
}

export function deactivate() {
  disableFocusMode();
}
