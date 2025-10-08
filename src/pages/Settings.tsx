import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Volume2, Camera, Brain, User, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    voice: {
      enabled: true,
      apiKey: '',
      volume: 0.8,
      voice: 'Lily',
    },
    camera: {
      enabled: true,
      resolution: '720p',
      frameRate: 30,
    },
    ai: {
      sensitivity: 0.7,
      feedbackDelay: 1000,
      autoCorrection: true,
    },
    notifications: {
      enabled: true,
      formAlerts: true,
      achievements: true,
      reminders: false,
    },
    profile: {
      name: '',
      email: '',
      fitnessLevel: 'Intermediate',
      goals: ['Form Improvement', 'Strength Building'],
    }
  });

  const { toast } = useToast();

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const saveSettings = () => {
    // In a real app, this would save to backend/localStorage
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const resetSettings = () => {
    // Reset to defaults
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 gradient-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Customize your PosePerfect AI experience
          </p>
        </div>

        <Tabs defaultValue="voice" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice" className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex items-center gap-3 mb-6">
                <Volume2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Voice Settings</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Enable Voice Feedback</Label>
                    <p className="text-sm text-muted-foreground">
                      Get real-time audio coaching during workouts
                    </p>
                  </div>
                  <Switch
                    checked={settings.voice.enabled}
                    onCheckedChange={(checked) => updateSetting('voice', 'enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label htmlFor="api-key">ElevenLabs API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your ElevenLabs API key..."
                    value={settings.voice.apiKey}
                    onChange={(e) => updateSetting('voice', 'apiKey', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for voice feedback. Get your key from{' '}
                    <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      elevenlabs.io
                    </a>
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Voice Selection</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Lily', 'Sarah', 'Charlotte', 'Alice'].map((voice) => (
                      <Button
                        key={voice}
                        variant={settings.voice.voice === voice ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSetting('voice', 'voice', voice)}
                      >
                        {voice}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Volume: {Math.round(settings.voice.volume * 100)}%</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.voice.volume}
                    onChange={(e) => updateSetting('voice', 'volume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="camera" className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex items-center gap-3 mb-6">
                <Camera className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Camera Settings</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Enable Camera</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow camera access for pose detection
                    </p>
                  </div>
                  <Switch
                    checked={settings.camera.enabled}
                    onCheckedChange={(checked) => updateSetting('camera', 'enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Video Quality</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['480p', '720p', '1080p'].map((resolution) => (
                      <Button
                        key={resolution}
                        variant={settings.camera.resolution === resolution ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSetting('camera', 'resolution', resolution)}
                      >
                        {resolution}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Frame Rate: {settings.camera.frameRate} FPS</Label>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="15"
                    value={settings.camera.frameRate}
                    onChange={(e) => updateSetting('camera', 'frameRate', parseInt(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">AI Settings</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Detection Sensitivity: {Math.round(settings.ai.sensitivity * 100)}%</Label>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.1"
                    value={settings.ai.sensitivity}
                    onChange={(e) => updateSetting('ai', 'sensitivity', parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher sensitivity provides more detailed feedback but may be more strict
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Feedback Delay: {settings.ai.feedbackDelay}ms</Label>
                  <input
                    type="range"
                    min="500"
                    max="3000"
                    step="500"
                    value={settings.ai.feedbackDelay}
                    onChange={(e) => updateSetting('ai', 'feedbackDelay', parseInt(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time between pose detection and feedback
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Auto-Correction Suggestions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically suggest form improvements
                    </p>
                  </div>
                  <Switch
                    checked={settings.ai.autoCorrection}
                    onCheckedChange={(checked) => updateSetting('ai', 'autoCorrection', checked)}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Notification Settings</h2>
              </div>

              <div className="space-y-6">
                {[
                  { key: 'enabled', label: 'Enable Notifications', description: 'Receive all notifications' },
                  { key: 'formAlerts', label: 'Form Alerts', description: 'Get notified about poor form' },
                  { key: 'achievements', label: 'Achievement Notifications', description: 'Celebrate your progress' },
                  { key: 'reminders', label: 'Workout Reminders', description: 'Daily workout reminders' },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                        onCheckedChange={(checked) => updateSetting('notifications', item.key, checked)}
                      />
                    </div>
                    {item.key !== 'reminders' && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 gradient-card">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Profile Settings</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={settings.profile.name}
                      onChange={(e) => updateSetting('profile', 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={settings.profile.email}
                      onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Fitness Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                      <Button
                        key={level}
                        variant={settings.profile.fitnessLevel === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSetting('profile', 'fitnessLevel', level)}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Fitness Goals</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Form Improvement', 'Strength Building', 'Weight Loss', 'Endurance', 'Flexibility'].map((goal) => (
                      <Badge
                        key={goal}
                        variant={settings.profile.goals.includes(goal) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const currentGoals = settings.profile.goals;
                          const newGoals = currentGoals.includes(goal)
                            ? currentGoals.filter(g => g !== goal)
                            : [...currentGoals, goal];
                          updateSetting('profile', 'goals', newGoals);
                        }}
                      >
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4 mt-8">
          <Button onClick={saveSettings} className="glow-primary">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={resetSettings}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;