import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCoachProps {
  feedback: string;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VoiceCoach = ({ feedback, isEnabled, onToggle }: VoiceCoachProps) => {
  // Default to the provided ElevenLabs API key (user-requested)
  const [apiKey] = useState('ap2_95a6f8ca-049a-4758-b0da-1e37b47ca32e');
  const [isConfigured] = useState(true);
  const [elevenLabsWorking, setElevenLabsWorking] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  const lastSpeakAtRef = useRef(0);

  // Web Speech fallback
  const speakWithWebSpeech = useCallback((text: string) => {
    try {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      if (!synth) throw new Error('Speech synthesis not supported');
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      // try to use a default voice; voices can be async-loaded
      const applyAndSpeak = () => {
        try {
          const voices = synth.getVoices();
          if (voices && voices.length > 0) {
            // pick a non-empty voice, prefer en*
            const prefer = voices.find(v => /en/i.test(v.lang)) || voices[0];
            utter.voice = prefer;
          }
          synth.cancel();
          synth.speak(utter);
        } catch (e) {
          synth.cancel();
          synth.speak(utter);
        }
      };
      if (synth.getVoices().length === 0) {
        // in some browsers voices load async
        const handler = () => {
          applyAndSpeak();
          synth.removeEventListener('voiceschanged', handler);
        };
        synth.addEventListener('voiceschanged', handler);
        // also attempt immediately
        applyAndSpeak();
      } else {
        applyAndSpeak();
      }
    } catch (e) {
      console.warn('Web Speech failed', e);
      throw e;
    }
  }, []);

  const speakFeedback = useCallback(async (text: string) => {
    if (!text) return;

    try {
      setIsSpeaking(true);
      // throttle to avoid rapid repeats
      const now = Date.now();
      if (now - lastSpeakAtRef.current < 700) {
        setIsSpeaking(false);
        return;
      }

      if (apiKey && elevenLabsWorking) {
        try {
          const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pFZP5JQG7iQjIQuC4Bku', {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': apiKey
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.2,
                use_speaker_boost: true
              }
            })
          });

          if (!response.ok) {
            if (response.status === 401) {
              console.log('ElevenLabs API key invalid/expired, falling back to browser TTS');
              setElevenLabsWorking(false);
              toast({
                title: "Voice API Issue",
                description: "ElevenLabs API unavailable, using browser voice instead.",
                variant: "default"
              });
              // Fallback to browser TTS
              speakWithWebSpeech(text);
              return;
            }
            throw new Error(`ElevenLabs API error: ${response.status}`);
          }

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };

          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            console.error('Audio playback failed');
            // Fallback to web speech
            speakWithWebSpeech(text);
          };

          await audio.play();
          lastSpeakAtRef.current = now;
        } catch (error) {
          console.error('ElevenLabs API error:', error);
          setElevenLabsWorking(false);
          toast({
            title: "Voice API Error",
            description: "Switching to browser voice synthesis.",
            variant: "default"
          });
          // Fallback to browser TTS
          speakWithWebSpeech(text);
        }
      } else {
        // No API key: use Web Speech
        speakWithWebSpeech(text);
        lastSpeakAtRef.current = now;
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Voice synthesis error:', error);
      setIsSpeaking(false);
      toast({
        title: "Voice Error",
        description: "Voice feedback failed. Using browser speech if available.",
        variant: "destructive",
      });
    }
  }, [apiKey, toast, speakWithWebSpeech]);

  // No-op since we now default to a configured API key
  const handleApiKeySubmit = () => {};

  // Auto-speak when feedback changes (effect, not during render)
  useEffect(() => {
    if (!isEnabled || !isConfigured || !feedback || isSpeaking) return;
    speakFeedback(feedback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, isEnabled, isConfigured]);

  // Always configured; skip setup UI

  return (
    <Card className="p-4 gradient-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted-foreground'}`}>
            {isEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-medium">Voice Coach</h4>
            <p className="text-xs text-muted-foreground">
              {isSpeaking ? 'Speaking...' : isEnabled ? 'Active' : 'Disabled'}
            </p>
          </div>
        </div>
        
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(!isEnabled)}
          disabled={isSpeaking}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </Card>
  );
};