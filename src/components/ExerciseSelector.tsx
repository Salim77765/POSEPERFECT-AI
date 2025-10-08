import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Target, Zap, Dumbbell, Footprints, Flame, Heart, Timer } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  focusAreas: string[];
  icon: React.ReactNode;
  duration: string;
  calories: string;
}

interface ExerciseSelectorProps {
  selectedExercise: string | null;
  onSelectExercise: (exerciseId: string) => void;
}

const exercises: Exercise[] = [
  {
    id: 'squat',
    name: 'Squats',
    description: 'Perfect your squat form with real-time knee and back alignment feedback',
    difficulty: 'Beginner',
    focusAreas: ['Legs', 'Glutes', 'Core'],
    icon: <Activity className="w-6 h-6" />,
    duration: '3-5 sets',
    calories: '~50 cal'
  },
  {
    id: 'pushup',
    name: 'Push-ups',
    description: 'Maintain proper body alignment and arm positioning throughout the movement',
    difficulty: 'Intermediate',
    focusAreas: ['Chest', 'Arms', 'Core'],
    icon: <Target className="w-6 h-6" />,
    duration: '3-4 sets',
    calories: '~40 cal'
  },
  {
    id: 'plank',
    name: 'Planks',
    description: 'Hold perfect plank position with spine alignment and core engagement tracking',
    difficulty: 'Beginner',
    focusAreas: ['Core', 'Shoulders', 'Back'],
    icon: <Zap className="w-6 h-6" />,
    duration: '30-60s',
    calories: '~25 cal'
  },
  {
    id: 'deadlift',
    name: 'Deadlifts',
    description: 'Master deadlift technique with hip hinge and spine position analysis',
    difficulty: 'Advanced',
    focusAreas: ['Back', 'Glutes', 'Hamstrings'],
    icon: <Dumbbell className="w-6 h-6" />,
    duration: '3-5 sets',
    calories: '~80 cal'
  },
  {
    id: 'lunge',
    name: 'Lunges',
    description: 'Perfect your lunge form with knee tracking and balance assessment',
    difficulty: 'Intermediate',
    focusAreas: ['Legs', 'Glutes', 'Balance'],
    icon: <Footprints className="w-6 h-6" />,
    duration: '3-4 sets',
    calories: '~60 cal'
  },
  {
    id: 'burpee',
    name: 'Burpees',
    description: 'Full-body movement analysis from squat to jump with form optimization',
    difficulty: 'Advanced',
    focusAreas: ['Full Body', 'Cardio', 'Strength'],
    icon: <Flame className="w-6 h-6" />,
    duration: '3-4 sets',
    calories: '~100 cal'
  },
  {
    id: 'mountain_climber',
    name: 'Mountain Climbers',
    description: 'High-intensity cardio with core stability and running form analysis',
    difficulty: 'Intermediate',
    focusAreas: ['Core', 'Cardio', 'Shoulders'],
    icon: <Heart className="w-6 h-6" />,
    duration: '30-45s',
    calories: '~70 cal'
  },
  {
    id: 'jumping_jack',
    name: 'Jumping Jacks',
    description: 'Cardio movement with arm and leg coordination tracking',
    difficulty: 'Beginner',
    focusAreas: ['Cardio', 'Coordination', 'Full Body'],
    icon: <Timer className="w-6 h-6" />,
    duration: '30-60s',
    calories: '~45 cal'
  }
];

export const ExerciseSelector = ({ selectedExercise, onSelectExercise }: ExerciseSelectorProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-500/20 text-green-400';
      case 'Intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'Advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Select Exercise</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {exercises.map((exercise) => (
          <Card 
            key={exercise.id}
            className={`p-6 cursor-pointer transition-all duration-300 hover:glow-primary gradient-card ${
              selectedExercise === exercise.id 
                ? 'ring-2 ring-primary glow-primary' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelectExercise(exercise.id)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                {exercise.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{exercise.name}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge className={getDifficultyColor(exercise.difficulty)}>
                    {exercise.difficulty}
                  </Badge>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-4">
              {exercise.description}
            </p>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-muted-foreground">
                Duration: {exercise.duration}
              </span>
              <span className="text-xs text-ai-accent font-medium">
                {exercise.calories}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {exercise.focusAreas.map((area) => (
                <Badge key={area} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
            
            {selectedExercise === exercise.id && (
              <Button 
                size="sm" 
                className="w-full mt-4 glow-primary"
              >
                Selected
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};