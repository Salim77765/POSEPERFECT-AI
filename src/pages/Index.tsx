import { useState } from 'react';
import { Header } from '@/components/Header';
import { ExerciseSelector } from '@/components/ExerciseSelector';
import { PoseDetection } from '@/components/PoseDetection';
import { VoiceCoach } from '@/components/VoiceCoach';
import { NLPCommands } from '@/components/NLPCommands';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-pose-detection.jpg';

const Index = () => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const { toast } = useToast();

  const handleNLPCommand = (command: string, confidence: number) => {
    console.log('[Index] Received NLP command:', command, 'confidence:', confidence);
    switch (command) {
      case 'start_squats':
        setSelectedExercise('squat');
        setCurrentFeedback('Starting squat workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_pushups':
        setSelectedExercise('pushup');
        setCurrentFeedback('Starting push-up workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_plank':
        setSelectedExercise('plank');
        setCurrentFeedback('Starting plank workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_deadlifts':
        setSelectedExercise('deadlift');
        setCurrentFeedback('Starting deadlift workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_lunges':
        setSelectedExercise('lunge');
        setCurrentFeedback('Starting lunge workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_burpees':
        setSelectedExercise('burpee');
        setCurrentFeedback('Starting burpee workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_mountain_climbers':
        setSelectedExercise('mountain_climber');
        setCurrentFeedback('Starting mountain climber workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_jumping_jacks':
        setSelectedExercise('jumping_jack');
        setCurrentFeedback('Starting jumping jack workout - turning on camera...');
        // Auto-start camera for workout
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'start_camera':
        setCurrentFeedback('Starting camera...');
        // Trigger camera start by dispatching a custom event
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      case 'stop_camera':
        setCurrentFeedback('Stopping camera...');
        // Trigger camera stop by dispatching a custom event
        window.dispatchEvent(new CustomEvent('nlp-stop-camera'));
        break;
      case 'enable_voice':
        setVoiceEnabled(true);
        setCurrentFeedback('Voice coaching enabled');
        break;
      case 'disable_voice':
        setVoiceEnabled(false);
        setCurrentFeedback('Voice coaching disabled');
        break;
      case 'check_form':
        setCurrentFeedback('Analyzing your current form...');
        break;
      case 'end_session':
        setSelectedExercise(null);
        setCurrentFeedback('Workout session ended - camera stopped');
        // Stop camera when ending workout
        window.dispatchEvent(new CustomEvent('nlp-stop-camera'));
        break;
      case 'pause_session':
        setCurrentFeedback('Workout paused - camera stopped');
        window.dispatchEvent(new CustomEvent('nlp-stop-camera'));
        break;
      case 'resume_session':
        setCurrentFeedback('Resuming workout - camera started');
        window.dispatchEvent(new CustomEvent('nlp-start-camera'));
        break;
      default:
        setCurrentFeedback(`Command "${command}" recognized with ${Math.round(confidence * 100)}% confidence`);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Image Section */}
      <section className="relative h-64 overflow-hidden">
        <img 
          src={heroImage} 
          alt="AI Pose Detection Technology" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </section>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Enhanced Controls Section */}
        <section className="grid lg:grid-cols-2 gap-6 mb-8">
          <VoiceCoach 
            feedback={currentFeedback}
            isEnabled={voiceEnabled}
            onToggle={setVoiceEnabled}
          />
          <NLPCommands 
            onCommand={handleNLPCommand}
            isListening={true}
          />
        </section>

        <Separator className="my-8" />

        {/* Exercise Selection */}
        <section>
          <ExerciseSelector 
            selectedExercise={selectedExercise}
            onSelectExercise={setSelectedExercise}
          />
        </section>

        <Separator className="my-8" />

        {/* Pose Detection Interface */}
        <section>
          <Card className="p-8 gradient-card">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">AI Pose Analysis</h2>
              {selectedExercise && (
                <div className="mb-6">
                  <Badge className="mb-4 glow-primary">
                    Currently analyzing: {selectedExercise.replace('_', ' ')}
                  </Badge>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Your camera will analyze your form in real-time and provide instant feedback to improve your technique.
                    {voiceEnabled && ' Voice coaching is active for audio feedback.'}
                  </p>
                </div>
              )}
              
              {!selectedExercise && (
                <div className="mb-6">
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Select an exercise above to begin pose analysis with real-time feedback.
                    Use voice commands or text input to control the system hands-free.
                  </p>
                </div>
              )}
            </div>
            
            <PoseDetection selectedExercise={selectedExercise} />
            
            {!selectedExercise && (
              <div className="mt-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  💡 Try voice commands like "start squats" or "enable voice feedback"
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline">Voice Control</Badge>
                  <Badge variant="outline">Real-time Analysis</Badge>
                  <Badge variant="outline">Form Scoring</Badge>
                  <Badge variant="outline">8+ Exercises</Badge>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Enhanced Features Grid */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 gradient-card text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-primary font-bold text-xl">AI</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Computer Vision</h3>
            <p className="text-muted-foreground text-sm">
              Advanced pose estimation algorithms analyze your movement in real-time
            </p>
          </Card>

          <Card className="p-6 gradient-card text-center">
            <div className="w-12 h-12 bg-ai-secondary/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-ai-secondary font-bold text-xl">🗣️</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Voice Coaching</h3>
            <p className="text-muted-foreground text-sm">
              ElevenLabs-powered voice feedback guides you through perfect form
            </p>
          </Card>

          <Card className="p-6 gradient-card text-center">
            <div className="w-12 h-12 bg-ai-accent/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-ai-accent font-bold text-xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Commands</h3>
            <p className="text-muted-foreground text-sm">
              Natural language processing understands your voice and text commands
            </p>
          </Card>

          <Card className="p-6 gradient-card text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-orange-400 font-bold text-xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Progress Tracking</h3>
            <p className="text-muted-foreground text-sm">
              Detailed analytics and progress reports to track your improvement
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Index;