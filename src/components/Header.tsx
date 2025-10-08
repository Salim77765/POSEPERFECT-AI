import { Activity, Brain, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const Header = () => {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-ai-secondary/20 animate-pulse-glow" />
      
      <div className="relative z-10 container mx-auto px-4 py-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-primary/20 glow-primary animate-float">
            <Brain className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
          PosePerfect AI
        </h1>
        
        <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
          Real-time exercise form analysis powered by computer vision. 
          Perfect your technique, prevent injuries, and maximize your workout effectiveness.
        </p>
        
        <div className="flex justify-center gap-4 flex-wrap">
          <Badge className="px-4 py-2 bg-primary/20 text-primary border-primary/30">
            <Activity className="w-4 h-4 mr-2" />
            Real-time Analysis
          </Badge>
          <Badge className="px-4 py-2 bg-ai-secondary/20 text-ai-secondary border-ai-secondary/30">
            <Zap className="w-4 h-4 mr-2" />
            Instant Feedback
          </Badge>
          <Badge className="px-4 py-2 bg-ai-accent/20 text-ai-accent border-ai-accent/30">
            <Brain className="w-4 h-4 mr-2" />
            AI-Powered
          </Badge>
        </div>
      </div>
    </header>
  );
};