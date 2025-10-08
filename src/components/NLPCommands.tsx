import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pipeline } from '@xenova/transformers';

interface NLPCommandsProps {
  onCommand: (command: string, confidence: number) => void;
  isListening?: boolean;
}

interface Command {
  intent: string;
  confidence: number;
  text: string;
}

export const NLPCommands = ({ onCommand, isListening = false }: NLPCommandsProps) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [lastCommand, setLastCommand] = useState<Command | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [whisperModel, setWhisperModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const { toast } = useToast();

  // Initialize speech recognition with fallback
  useEffect(() => {
    const initializeSpeechRecognition = async () => {
      // First try to load Whisper model
      try {
        setIsModelLoading(true);
        console.log('Attempting to load Whisper model...');
        
        const model = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        setWhisperModel(model);
        setIsModelLoading(false);
        console.log('Whisper model loaded successfully');
        
        toast({
          title: "🎯 Advanced Speech Recognition Ready",
          description: "Local Whisper model loaded. High-quality voice commands available!",
        });
        return;
      } catch (error) {
        console.log('Whisper model failed to load, trying Web Speech API fallback...', error);
      }

      // Fallback to Web Speech API if available
      if (typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';
          
          recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
              .map(result => result[0].transcript)
              .join('');
            
            if (event.results[event.results.length - 1].isFinal) {
              console.log('Web Speech API transcription:', transcript);
              processCommand(transcript);
              toast({
                title: "✅ Voice Command Recognized",
                description: `"${transcript}"`,
              });
            }
          };
          
          recognition.onerror = (event) => {
            console.error('Web Speech API error:', event.error);
            setIsVoiceActive(false);
            setSpeechError(event.error);
            
            if (event.error === 'network') {
              console.log('Web Speech API network error - speech services unavailable');
              toast({
                title: "Speech Services Unavailable",
                description: "Both Whisper and Web Speech API are currently unavailable. Please use text commands for reliable control.",
                variant: "destructive"
              });
              // Clear recognition since it's not working
              setRecognition(null);
            } else if (event.error === 'not-allowed') {
              toast({
                title: "Microphone Permission Required",
                description: "Please allow microphone access to use voice commands.",
                variant: "destructive"
              });
            }
          };
          
          recognition.onend = () => {
            setIsVoiceActive(false);
          };
          
          setRecognition(recognition);
          setIsModelLoading(false);
          console.log('Web Speech API initialized as fallback');
          
          toast({
            title: "🎤 Basic Speech Recognition Ready",
            description: "Web Speech API available. Voice commands ready to use!",
          });
        } else {
          setIsModelLoading(false);
          toast({
            title: "Speech Recognition Unavailable",
            description: "No speech recognition available. Please use text commands.",
            variant: "destructive"
          });
        }
      }
    };

    initializeSpeechRecognition();
  }, []);

  const processCommand = async (text: string) => {
    try {
      console.log('[NLPCommands] Processing command:', text);
      // Simple NLP processing for fitness commands
      const command = analyzeCommand(text.toLowerCase());
      setLastCommand(command);
      console.log('[NLPCommands] Analyzed command:', command);
      
      if (command.confidence >= 0.6) {
        console.log('[NLPCommands] Command accepted, calling onCommand:', command.intent);
        onCommand(command.intent, command.confidence);
        toast({
          title: "Command Recognized",
          description: `${command.intent} (${Math.round(command.confidence * 100)}% confidence)`,
        });
      } else {
        console.log('[NLPCommands] Command confidence too low:', command.confidence);
      }
    } catch (error) {
      console.error('NLP processing error:', error);
    }
  };

  const analyzeCommand = (text: string): Command => {
    // Enhanced command patterns for fitness
    const commandPatterns = [
      // Exercise selection
      { pattern: /(start|begin|do)\s+(squat|squats)/i, intent: 'start_squats', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(pushup|push.?up|push.?ups)/i, intent: 'start_pushups', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(plank|planks)/i, intent: 'start_plank', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(deadlift|deadlifts)/i, intent: 'start_deadlifts', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(lunge|lunges)/i, intent: 'start_lunges', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(burpee|burpees)/i, intent: 'start_burpees', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(mountain.?climber|mountain.?climbers)/i, intent: 'start_mountain_climbers', weight: 0.9 },
      { pattern: /(start|begin|do)\s+(jumping.?jack|jumping.?jacks)/i, intent: 'start_jumping_jacks', weight: 0.9 },
      
      // Camera controls
      { pattern: /(start|turn.?on|enable)\s+(camera|video)/i, intent: 'start_camera', weight: 0.8 },
      { pattern: /(stop|turn.?off|disable)\s+(camera|video)/i, intent: 'stop_camera', weight: 0.8 },
      
      // Voice controls
      { pattern: /(enable|turn.?on|start)\s+(voice|audio|sound|coaching)/i, intent: 'enable_voice', weight: 0.9 },
      { pattern: /(disable|turn.?off|stop|mute)\s+(voice|audio|sound|coaching)/i, intent: 'disable_voice', weight: 0.9 },
      { pattern: /voice\s+(on|enabled?)/i, intent: 'enable_voice', weight: 0.9 },
      { pattern: /voice\s+(off|disabled?)/i, intent: 'disable_voice', weight: 0.9 },
      
      // Feedback requests
      { pattern: /(how.?s|check)\s+(my|the)\s+(form|posture|position)/i, intent: 'check_form', weight: 0.7 },
      { pattern: /(what.?s|give.?me)\s+(feedback|advice|tips)/i, intent: 'get_feedback', weight: 0.7 },
      
      // Navigation
      { pattern: /(show|go.?to|open)\s+(progress|stats|history)/i, intent: 'show_progress', weight: 0.8 },
      { pattern: /(show|go.?to|open)\s+(settings|config)/i, intent: 'show_settings', weight: 0.8 },
      
      // Session controls
      { pattern: /(pause|stop)\s+(workout|session|exercise)/i, intent: 'pause_session', weight: 0.8 },
      { pattern: /(resume|continue)\s+(workout|session|exercise)/i, intent: 'resume_session', weight: 0.8 },
      { pattern: /(end|finish|complete)\s+(workout|session)/i, intent: 'end_session', weight: 0.8 },
    ];

    let bestMatch: Command = { intent: 'unknown', confidence: 0, text };
    
    for (const { pattern, intent, weight } of commandPatterns) {
      const match = text.match(pattern);
      if (match) {
        const confidence = weight * (match[0].length / text.length);
        if (confidence > bestMatch.confidence) {
          bestMatch = { intent, confidence, text };
        }
      }
    }

    // Fallback: check for exercise names
    const exercises = ['squat', 'pushup', 'plank', 'deadlift', 'lunge', 'burpee', 'crunch'];
    for (const exercise of exercises) {
      if (text.includes(exercise)) {
        bestMatch = { intent: `start_${exercise}s`, confidence: 0.6, text };
        break;
      }
    }

    return bestMatch;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsVoiceActive(true);

      toast({
        title: "🎤 Recording Started",
        description: "Speak your command clearly. Click stop when finished.",
      });

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 10000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice commands.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsVoiceActive(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!whisperModel) {
      toast({
        title: "Model Not Ready",
        description: "Speech recognition model is still loading. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "🔄 Processing Speech",
        description: "Transcribing your voice command...",
      });

      // Convert blob to audio buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get audio data as Float32Array
      const audioData = audioBuffer.getChannelData(0);
      
      // Transcribe with Whisper
      const result = await whisperModel(audioData, {
        sampling_rate: audioBuffer.sampleRate,
      });

      const transcript = result.text.trim();
      console.log('Whisper transcription:', transcript);

      if (transcript) {
        processCommand(transcript);
        toast({
          title: "✅ Voice Command Recognized",
          description: `"${transcript}"`,
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: "Please try speaking more clearly.",
        });
      }

    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription Failed",
        description: "Could not process voice command. Please try again or use text commands.",
        variant: "destructive"
      });
    }
  };

  const toggleVoiceRecognition = () => {
    if (isModelLoading) {
      toast({
        title: "Loading Speech Recognition",
        description: "Please wait while speech recognition initializes...",
      });
      return;
    }

    if (isVoiceActive) {
      // Stop current recognition
      if (whisperModel) {
        stopRecording();
      } else if (recognition) {
        recognition.stop();
        setIsVoiceActive(false);
      }
    } else {
      // Start recognition - prefer Whisper, fallback to Web Speech API
      if (whisperModel) {
        startRecording();
      } else if (recognition) {
        try {
          recognition.start();
          setIsVoiceActive(true);
          toast({
            title: "🎤 Listening",
            description: "Speak your command clearly...",
          });
        } catch (error) {
          console.error('Error starting Web Speech API:', error);
          toast({
            title: "Speech Recognition Failed",
            description: "Could not start voice recognition. Use text commands instead.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Speech Recognition Unavailable",
          description: "No speech recognition available. Please use text commands.",
          variant: "destructive"
        });
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NLPCommands] Text form submitted with:', textInput);
    if (textInput.trim()) {
      console.log('[NLPCommands] Processing text command:', textInput.trim());
      processCommand(textInput);
      setTextInput('');
    } else {
      console.log('[NLPCommands] Empty text input, not processing');
    }
  };



  return (
    <Card className="p-6 gradient-card">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Voice & Text Commands</h3>
      </div>

      <div className="space-y-4">
        {/* Voice Recognition */}
        <div className="flex items-center gap-4">
          <Button
            variant={isVoiceActive ? "destructive" : isModelLoading ? "outline" : "default"}
            onClick={toggleVoiceRecognition}
            disabled={isModelLoading}
            className={isVoiceActive ? "animate-pulse-glow" : ""}
          >
            {isVoiceActive ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            {isModelLoading ? 'Loading Model...' : isVoiceActive ? 'Stop Recording' : 'Start Voice Commands'}
          </Button>
          
          {isVoiceActive && (
            <Badge variant="secondary" className="animate-pulse">
              Listening...
            </Badge>
          )}
          
          {speechError && speechError !== 'no-speech' && (
            <Badge variant="destructive">
              {speechError === 'network' ? 'Network Error' :
               speechError === 'not-allowed' ? 'Mic Blocked' :
               speechError === 'timeout' ? 'Service Timeout' :
               'Voice Error'}
            </Badge>
          )}
        </div>

        {/* Text Input */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            placeholder="Type a command... (e.g., 'start squats', 'check my form')"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!textInput.trim()}
          >
            Send
          </Button>
        </form>

        {/* Last Command */}
        {lastCommand && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Last Command:</span>
              <Badge variant={lastCommand.confidence > 0.7 ? "default" : "secondary"}>
                {Math.round(lastCommand.confidence * 100)}% confidence
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">"{lastCommand.text}"</p>
            <p className="text-sm font-medium mt-1">Intent: {lastCommand.intent.replace('_', ' ')}</p>
          </div>
        )}

        {/* Command Examples */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-2">Try saying:</p>
          <div className="grid grid-cols-2 gap-1">
            <span>"Start squats"</span>
            <span>"Check my form"</span>
            <span>"Turn on camera"</span>
            <span>"Show progress"</span>
            <span>"Enable voice feedback"</span>
            <span>"End workout"</span>
          </div>
        </div>
      </div>
    </Card>
  );
};