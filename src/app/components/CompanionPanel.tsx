import { Check, Circle } from 'lucide-react';
import { useState } from 'react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface CompanionPanelProps {
  gameMode: string;
}

export function CompanionPanel({ gameMode }: CompanionPanelProps) {
  const [tetrasCompletedTasks, setTetrasCompletedTasks] = useState<Task[]>([
    { id: 1, text: 'Clear 5 lines', completed: true },
    { id: 2, text: 'Score 1000 points', completed: false },
    { id: 3, text: 'Play for 10 minutes', completed: false }
  ]);

  const [crossingTasks, setCrossingTasks] = useState<Task[]>([
    { id: 1, text: 'Cross 5 roads safely', completed: true },
    { id: 2, text: 'Score 100 points', completed: false },
    { id: 3, text: 'Reach goal zone 3 times', completed: false }
  ]);

  const tasks = gameMode === 'tetras' ? tetrasCompletedTasks : crossingTasks;
  const setTasks = gameMode === 'tetras' ? setTetrasCompletedTasks : setCrossingTasks;

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const companionData = gameMode === 'tetras'
    ? { avatar: '🎮', name: 'Pixel Pal', level: 5, message: "You're on a roll! Keep stacking those blocks." }
    : { avatar: '🦉', name: 'Safety Owl', level: 6, message: "Look both ways and take your time crossing!" };

  return (
    <div className="w-full lg:w-72 shrink-0 h-auto lg:h-full flex flex-col gap-4">
      <div
        className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md rounded-2xl p-5 border border-border shadow-lg"
        style={{
          boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl shadow-md">
            {companionData.avatar}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">{companionData.name}</div>
            <div className="text-xs text-muted-foreground">Level {companionData.level}</div>
          </div>
        </div>

        <div className="bg-secondary/30 rounded-xl p-3 relative">
          <div className="absolute -top-2 left-6 w-4 h-4 bg-secondary/30 rotate-45" />
          <p className="text-sm text-foreground/90 italic">
            "{companionData.message}"
          </p>
        </div>
      </div>


    </div>
  );
}
