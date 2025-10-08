import { Link, useLocation } from 'react-router-dom';
import { Brain, Activity, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Workout', icon: Activity },
    { path: '/progress', label: 'Progress', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 glow-primary">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
              PosePerfect AI
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Button
                key={path}
                variant={location.pathname === path ? "default" : "ghost"}
                size="sm"
                asChild
                className={cn(
                  "transition-all duration-300",
                  location.pathname === path && "glow-primary"
                )}
              >
                <Link to={path} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};