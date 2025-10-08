import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Target, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useMetricsStore } from '@/store/metricsStore';

const Progress = () => {
  const frames = useMetricsStore((s) => s.frames);
  const totalReps = useMetricsStore((s) => s.totalReps);
  const repsByExercise = useMetricsStore((s) => s.repsByExercise);
  const resetSession = useMetricsStore((s) => s.resetSession);

  const avgFormScore = useMemo(() => {
    if (!frames.length) return 0;
    const sum = frames.reduce((acc, f) => acc + (f.formScore || 0), 0);
    return Math.round((sum / frames.length) || 0);
  }, [frames]);

  const lineData = useMemo(() => {
    return frames.map((f) => ({
      time: new Date(f.t).toLocaleTimeString(),
      score: f.formScore,
    }));
  }, [frames]);

  const pieData = useMemo(() => {
    return [
      { name: 'Squats', value: repsByExercise.squat, color: '#00D2FF' },
      { name: 'Push-ups', value: repsByExercise.pushup, color: '#B847FF' },
      { name: 'Unknown', value: repsByExercise.unknown, color: '#8884d8' },
    ];
  }, [repsByExercise]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 gradient-primary bg-clip-text text-transparent">
            Your Progress
          </h1>
          <p className="text-muted-foreground">Live analytics from your current session</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 gradient-card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/20 glow-primary">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">{totalReps}</h3>
            <p className="text-muted-foreground text-sm">Total Reps (Session)</p>
          </Card>

          <Card className="p-6 gradient-card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-ai-accent/20">
                <TrendingUp className="w-6 h-6 text-ai-accent" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">{avgFormScore}%</h3>
            <p className="text-muted-foreground text-sm">Avg Form Score</p>
          </Card>

          <Card className="p-6 gradient-card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-ai-secondary/20">
                <Target className="w-6 h-6 text-ai-secondary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">{frames.length}</h3>
            <p className="text-muted-foreground text-sm">Samples Captured</p>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exercises">Exercises</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Form Scores */}
              <Card className="p-6 gradient-card">
                <h3 className="text-lg font-semibold mb-4">Live Form Scores</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Reps by Exercise */}
              <Card className="p-6 gradient-card">
                <h3 className="text-lg font-semibold mb-4">Reps by Exercise</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exercise Performance (Live Avg by Exercise) */}
              <Card className="p-6 gradient-card">
                <h3 className="text-lg font-semibold mb-4">Exercise Performance</h3>
                <div className="space-y-4">
                  {[{ key: 'squat', label: 'Squats' }, { key: 'pushup', label: 'Push-ups' }].map((ex) => {
                    const filtered = frames.filter((f) => f.detectedExercise === (ex.key as any));
                    const avg = filtered.length ? Math.round(filtered.reduce((a, f) => a + f.formScore, 0) / filtered.length) : 0;
                    const sessions = repsByExercise[ex.key as 'squat' | 'pushup'];
                    return (
                      <div key={ex.key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{ex.label}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{sessions} reps</Badge>
                            <span className="text-sm font-medium">{avg}%</span>
                          </div>
                        </div>
                        <ProgressBar value={avg} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Session Controls */}
              <Card className="p-6 gradient-card">
                <h3 className="text-lg font-semibold mb-4">Session Controls</h3>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetSession}>Reset Session</Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          
        </Tabs>
      </div>
    </div>
  );
};

export default Progress;