import { Grid3x3, Navigation2 } from 'lucide-react';

interface LandingViewProps {
  onSelectGame: (gameId: 'tetras' | 'crossing') => void;
}

export function LandingView({ onSelectGame }: LandingViewProps) {
  const games = [
    {
      id: 'tetras',
      title: 'Tetras',
      description: 'Classic block puzzle game designed for relaxation and focus.',
      icon: Grid3x3,
      color: 'bg-primary/20 text-primary',
    },
    {
      id: 'crossing',
      title: 'Road Crossing',
      description: 'Guide the characters safely across traffic and obstacles.',
      icon: Navigation2,
      color: 'bg-secondary/40 text-secondary-foreground',
    }
  ] as const;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 gap-4 md:gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold mb-2">Zen Gaming</h1>
        <p className="text-muted-foreground text-lg">Select a game to focus your mind</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-3xl">
        {games.map((game) => (
           <button
             key={game.id}
             onClick={() => onSelectGame(game.id)}
             className="cursor-pointer flex-1 flex flex-col items-center p-4 md:p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 group"
           >
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${game.color}`}>
               <game.icon size={32} strokeWidth={1.5} />
             </div>
             <h2 className="text-2xl font-medium mb-3">{game.title}</h2>
             <p className="text-muted-foreground text-center line-clamp-3">
               {game.description}
             </p>
           </button>
        ))}
      </div>
    </div>
  );
}
