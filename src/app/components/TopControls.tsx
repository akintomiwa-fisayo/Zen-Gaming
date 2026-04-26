import { Volume2, VolumeX, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopControlsProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onBack?: () => void;
}

export function TopControls({ theme, onThemeToggle, onBack }: TopControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isExtensionEnv, setIsExtensionEnv] = useState(false);

  useEffect(() => {
    // Detect if we're rendering inside the VSCode extension webview
    const isVSCode = typeof window !== 'undefined' && (
      'acquireVsCodeApi' in window || 
      document.body.className.includes('vscode-') || 
      new URLSearchParams(window.location.search).has('vscode')
    );
    setIsExtensionEnv(Boolean(isVSCode));
  }, []);

  return (
    <div className=" mt-4 right-4 flex items-center gap-2 z-10 w-full px-3 pointer-events-none data-[has-back=true]:justify-between justify-end" data-has-back={!!onBack}>
      {onBack && (
        <button
          onClick={onBack}
          className="cursor-pointer pointer-events-auto h-9 px-3 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-200 gap-2 shadow-sm"
          aria-label="Back to games"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {!isExtensionEnv && (
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="cursor-pointer w-9 h-9 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-200"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            onClick={onThemeToggle}
            className="cursor-pointer w-9 h-9 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
