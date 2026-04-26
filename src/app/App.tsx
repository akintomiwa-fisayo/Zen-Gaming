import { useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import { LandingView } from './components/LandingView';
import { TopControls } from './components/TopControls';
import { BlocksView } from './components/BlocksView';
import { RoadCrossingView } from './components/RoadCrossingView';
import { CompanionPanel } from './components/CompanionPanel';

export default function App() {
  const [activeView, setActiveView] = useState<'landing' | 'tetras' | 'crossing'>('landing');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const isEditorView = (window as any).__VSCODE_VIEW_TYPE__ === 'editor';
  const initialIsExpanded = (window as any).__INITIAL_IS_EXPANDED__ || false;
  const [isGameExpanded, setIsGameExpanded] = useState(initialIsExpanded);

  useEffect(() => {
    // Save VS Code API globally since it can only be acquired once
    const isVSCode = typeof window !== 'undefined' && 'acquireVsCodeApi' in window;
    const vscodeApi = isVSCode ? ((window as any).vscodeApi || ((window as any).vscodeApi = (window as any).acquireVsCodeApi())) : null;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.command === 'sync-state') {
        setIsGameExpanded(event.data.isExpanded);
      }
    };
    window.addEventListener('message', handleMessage);

    if (vscodeApi && !isEditorView) {
      // Request active state whenever sidebar boots or regains visibility
      vscodeApi.postMessage({ command: 'request-sync' });
      const handleVisibility = () => {
        if (!document.hidden) vscodeApi.postMessage({ command: 'request-sync' });
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        window.removeEventListener('message', handleMessage);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [isEditorView]);

  useEffect(() => {
    // Detect VSCode context
    const isVSCode = typeof window !== 'undefined' && (
      'acquireVsCodeApi' in window || 
      document.body.className.includes('vscode-light') || 
      document.body.className.includes('vscode-dark') || 
      document.body.className.includes('vscode-high-contrast')
    );

    if (isVSCode || new URLSearchParams(window.location.search).has('vscode')) {
      document.body.classList.add('vscode-dark'); // Use vscode styling mapping
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderView = () => {
    switch (activeView) {
      case 'landing':
        return <LandingView onSelectGame={(gameId) => setActiveView(gameId)} />;
      case 'tetras':
        return <BlocksView />;
      case 'crossing':
        return <RoadCrossingView />;
      default:
        return <LandingView onSelectGame={(gameId) => setActiveView(gameId)} />;
    }
  };

  const isLanding = activeView === 'landing';

  if (!isEditorView && isGameExpanded) {
    return (
      <div className="flex bg-background h-screen w-full flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--vscode-editor-background)' }}>
        <div className="bg-card/50 backdrop-blur-md border border-border p-8 rounded-2xl shadow-xl flex flex-col items-center">
          <Maximize2 size={48} className="mb-6 opacity-30 text-foreground" />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--vscode-editor-foreground)' }}>Playing in Main Editor</h2>
          <p className="text-muted-foreground text-sm max-w-xs" style={{ color: 'var(--vscode-descriptionForeground)' }}>
            Close the expanded editor tab to resume your session here in the side panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <div className="relative flex-1 flex flex-col min-h-0">
        <TopControls 
          theme={theme} 
          onThemeToggle={handleThemeToggle} 
          onBack={isLanding ? undefined : () => setActiveView('landing')} 
        />

        <div className={`flex-1 flex flex-col lg:flex-row p-2 md:p-4 gap-2 md:gap-4 transition-all min-h-0 overflow-y-auto overflow-x-hidden ${isLanding ? 'items-center justify-center' : ''}`}>
            <div
            className={`flex-1 w-full relative rounded-2xl flex min-h-0 items-center justify-center`}
            style={{
              background: theme === 'light'
                ? 'radial-gradient(circle at 50% 50%, rgba(156, 175, 136, 0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 50%, rgba(156, 175, 136, 0.05) 0%, transparent 70%)'
            }}
          >
            <div
              className={`w-full h-full ${!isLanding ? 'bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-xl border border-border shadow-2xl' : ''} rounded-2xl overflow-hidden`}
              style={!isLanding ? {
                boxShadow: theme === 'light'
                  ? '0 20px 60px rgba(143, 168, 131, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(143, 168, 131, 0.1)'
                  : '0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 rgba(143, 168, 131, 0.1)'
              } : undefined}
            >
              {renderView()}
            </div>
          </div>

          {!isLanding && (
            <CompanionPanel gameMode={activeView} />
          )}
        </div>
      </div>
    </div>
  );
}