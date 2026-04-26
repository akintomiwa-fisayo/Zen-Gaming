import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let activePanel: vscode.WebviewPanel | undefined = undefined;

function getWebviewContent(distPath: string, webview: vscode.Webview, viewType: string, isExpanded: boolean): string {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    let htmlContent = fs.readFileSync(indexPath, 'utf-8');
    htmlContent = htmlContent.replace(/(href|src)="\/([^"]+)"/g, (match, prefix, assetPath) => {
      const fileUri = vscode.Uri.file(path.join(distPath, assetPath));
      return `${prefix}="${webview.asWebviewUri(fileUri)}"`;
    });
    
    // Inject state configuration
    const injectedState = `<script>
      window.__VSCODE_VIEW_TYPE__ = "${viewType}";
      window.__INITIAL_IS_EXPANDED__ = ${isExpanded};
    </script>`;
    htmlContent = htmlContent.replace('</head>', `${injectedState}</head>`);
    return htmlContent;
  }
  return `<h1>Build Missing</h1><p>Please build the web app first using <code>npm run build:web</code> so that dist/index.html exists.</p>`;
}

class ZenGamesViewProvider implements vscode.WebviewViewProvider {
  public webviewView?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.webviewView = webviewView;
    const distPath = path.join(this._extensionUri.fsPath, 'dist');
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(distPath)]
    };
    webviewView.webview.html = getWebviewContent(distPath, webviewView.webview, 'sidebar', !!activePanel);

    // Listen for sync requests from the React App dynamically
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === 'request-sync') {
        webviewView.webview.postMessage({ command: 'sync-state', isExpanded: !!activePanel });
      }
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const distPath = path.join(context.extensionUri.fsPath, 'dist');

  // 1. Register the sidebar provider
  const provider = new ZenGamesViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('zen-games-view', provider)
  );

  // 2. Command: Start/Focus the sidebar
  context.subscriptions.push(
    vscode.commands.registerCommand('zen-games.start', () => {
      vscode.commands.executeCommand('zen-games-view.focus');
    })
  );

  // 3. Command: Expand side panel into a massive main editor window
  context.subscriptions.push(
    vscode.commands.registerCommand('zen-games.expand', () => {
      if (activePanel) {
        activePanel.reveal(vscode.ViewColumn.One);
        return;
      }

      activePanel = vscode.window.createWebviewPanel(
        'zenGamesFull',
        'Zen Games',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(distPath)]
        }
      );
      
      activePanel.webview.html = getWebviewContent(distPath, activePanel.webview, 'editor', true);

      // Notify sidebar that editor was opened securely using sync-state
      provider.webviewView?.webview.postMessage({ command: 'sync-state', isExpanded: true });

      activePanel.onDidDispose(() => {
        activePanel = undefined;
        // Notify sidebar that editor was closed securely using sync-state
        provider.webviewView?.webview.postMessage({ command: 'sync-state', isExpanded: false });
      });
    })
  );
}

export function deactivate() {}
