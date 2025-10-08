import { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Square, Camera, Activity, AlertCircle, Volume2, VolumeX, Mic, MicOff, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMetricsStore, type ExerciseType } from '@/store/metricsStore';

interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

interface Pose {
  keypoints: PoseKeypoint[];
  score?: number;
}

interface ExerciseAnalysis {
  formScore: number;
  feedback: string;
  repCount: number;
  phase: 'up' | 'down' | 'hold' | 'rest';
  angles?: {
    leftElbow?: number;
    rightElbow?: number;
    leftKnee?: number;
    rightKnee?: number;
    leftHip?: number;
    rightHip?: number;
    leftShoulder?: number;
    rightShoulder?: number;
  };
  rom?: {
    leftKnee?: { min: number; max: number };
    rightKnee?: { min: number; max: number };
    leftElbow?: { min: number; max: number };
    rightElbow?: { min: number; max: number };
  };
  detectedExercise?: ExerciseType;
}

interface PoseDetectionProps {
  selectedExercise?: string | null;
}

export const PoseDetection = ({ selectedExercise }: PoseDetectionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  const isActiveRef = useRef<boolean>(false);
  
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [keypointsData, setKeypointsData] = useState<Array<{x: number, y: number, confidence: number, type: string}>>([]);
  const [skeletonLines, setSkeletonLines] = useState<Array<{x1: number, y1: number, x2: number, y2: number, color: string}>>([]);
  const [analysis, setAnalysis] = useState<ExerciseAnalysis>({
    formScore: 0,
    feedback: '',
    repCount: 0,
    phase: 'rest'
  });
  const [fps, setFps] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [backend, setBackend] = useState<string>('');
  const { toast } = useToast();
  const addFrame = useMetricsStore((s) => s.addFrame);
  const addRep = useMetricsStore((s) => s.addRep);
  const resetSession = useMetricsStore((s) => s.resetSession);
  const sessionReset = useRef(false);
  const prevReportedRepsRef = useRef(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const lastSpeakTimeRef = useRef(0);
  const lastFeedbackRef = useRef<string>('');
  const [cmdText, setCmdText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- TTS helper ---
  const speak = (text: string, rate = 1) => {
    try {
      if (!voiceOn) return;
      const synth = (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;
      if (!synth) return;
      const now = Date.now();
      // throttle overall speech to avoid spam
      if (now - lastSpeakTimeRef.current < 600) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      synth.cancel();
      synth.speak(utter);
      lastSpeakTimeRef.current = now;
    } catch {}
  };

  // --- Command handling (inside component) ---
  const handleCommand = (raw: string) => {
    const text = raw.trim().toLowerCase();
    if (!text) return;
    if (/(start|begin).*detec|start camera|go live/.test(text)) {
      startCamera();
      speak('Starting detection');
      return;
    }
    if (/(stop|end|pause).*detec|stop camera|stop live/.test(text)) {
      stopCamera();
      speak('Stopping detection');
      return;
    }
    if (/voice (on|enable)|unmute voice|speak on/.test(text)) {
      setVoiceOn(true);
      speak('Voice enabled');
      return;
    }
    if (/voice (off|disable)|mute voice|speak off/.test(text)) {
      setVoiceOn(false);
      speak('Voice disabled');
      return;
    }
    if (/reset (session|metrics)|clear session/.test(text)) {
      resetSession();
      prevReportedRepsRef.current = 0;
      speak('Session reset');
      return;
    }
    if (/(how many|what).*rep|rep count|reps\??/.test(text)) {
      speak(`Total reps ${analysis.repCount}`);
      return;
    }
    if (/knee angle|knee\??/.test(text)) {
      const val = analysis.angles?.leftKnee ?? analysis.angles?.rightKnee;
      if (val != null) speak(`Knee angle ${Math.round(val)} degrees`);
      return;
    }
    if (/elbow angle|elbow\??/.test(text)) {
      const val = analysis.angles?.leftElbow ?? analysis.angles?.rightElbow;
      if (val != null) speak(`Elbow angle ${Math.round(val)} degrees`);
      return;
    }
    if (analysis.feedback) speak(analysis.feedback);
  };

  const startListening = () => {
    try {
      const AnyRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!AnyRec) {
        toast({ title: 'Voice Commands', description: 'Speech recognition not supported in this browser.', variant: 'destructive' });
        return;
      }
      const rec = new AnyRec();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev: any) => {
        const txt = ev.results?.[0]?.[0]?.transcript ?? '';
        handleCommand(txt);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
      speak('Listening');
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } finally {
      setIsListening(false);
    }
  };

  // --- Geometry helpers ---
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;
  const angleBetween = (
    a?: { x: number; y: number },
    b?: { x: number; y: number },
    c?: { x: number; y: number }
  ) => {
    if (!a || !b || !c) return undefined;
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const normAB = Math.hypot(ab.x, ab.y);
    const normCB = Math.hypot(cb.x, cb.y);
    if (normAB === 0 || normCB === 0) return undefined;
    const cosTheta = Math.min(1, Math.max(-1, dot / (normAB * normCB)));
    return toDegrees(Math.acos(cosTheta));
  };

  // Keep simple ROM buffers per joint
  const romBuffersRef = useRef<{ [key: string]: number[] }>({});
  const pushRom = (key: string, value?: number) => {
    if (value == null || isNaN(value)) return;
    if (!romBuffersRef.current[key]) romBuffersRef.current[key] = [];
    const buf = romBuffersRef.current[key];
    buf.push(value);
    if (buf.length > 150) buf.shift(); // ~5s at 30fps
  };

  // --- Rep counting helpers/state ---
  const repCountRef = useRef<number>(0);
  const lastRepTimeRef = useRef<number>(0);
  const kneePhaseRef = useRef<'up' | 'down'>('up');
  const elbowPhaseRef = useRef<'up' | 'down'>('up');
  const kneeDownSinceRef = useRef<number>(0);
  const elbowDownSinceRef = useRef<number>(0);
  const prevAnglesRef = useRef<{ [k: string]: number | undefined }>({});

  const smooth = (name: string, current?: number, alpha = 0.6) => {
    if (current == null || isNaN(current)) return prevAnglesRef.current[name];
    const prev = prevAnglesRef.current[name];
    const smoothed = prev == null ? current : alpha * current + (1 - alpha) * (prev as number);
    prevAnglesRef.current[name] = smoothed;
    return smoothed;
  };

  const generateExerciseSpecificFeedback = (
    exercise: ExerciseType,
    formScore: number,
    angles: {
      leftKnee?: number;
      rightKnee?: number;
      leftElbow?: number;
      rightElbow?: number;
      leftHip?: number;
      rightHip?: number;
    },
    shoulderAlignment: number,
    hipAlignment: number,
    spineAlignment: number,
    phase: 'up' | 'down' | 'hold' | 'rest'
  ): string => {
    const { leftKnee, rightKnee, leftElbow, rightElbow, leftHip, rightHip } = angles;

    switch (exercise) {
      case 'squat':
        if (formScore > 85) return '🏆 Perfect squat form! Excellent depth and alignment';
        if (leftKnee && rightKnee) {
          const minKnee = Math.min(leftKnee, rightKnee);
          if (phase === 'down' && minKnee > 100) return '⬇️ Go deeper - aim for 90° knee angle';
          if (minKnee < 70) return '⚠️ Too deep - risk of knee strain';
          if (minKnee < 90 && phase === 'hold') return '✅ Great depth! Hold and drive up';
          if (Math.abs(leftKnee - rightKnee) > 15) return '⚖️ Keep knees even - balance your weight';
        }
        if (spineAlignment > 0.1) return '📏 Keep chest up and spine straight';
        if (shoulderAlignment > 0.05) return '🤝 Level your shoulders for balance';
        return '💪 Good squat! Focus on controlled movement';

      case 'pushup':
        if (formScore > 85) return '🔥 Perfect push-up form! Strong and controlled';
        if (leftElbow && rightElbow) {
          const minElbow = Math.min(leftElbow, rightElbow);
          if (phase === 'down' && minElbow > 100) return '⬇️ Lower down - aim for 90° elbow angle';
          if (minElbow < 70) return '⚠️ Too low - maintain control';
          if (minElbow < 90 && phase === 'hold') return '✅ Great depth! Push up strong';
          if (Math.abs(leftElbow - rightElbow) > 20) return '⚖️ Keep elbows even - balanced push';
        }
        if (spineAlignment > 0.15) return '📏 Keep body straight - plank position';
        return '💪 Good push-up! Keep core engaged';

      case 'plank':
        if (formScore > 85) return '🔥 Perfect plank! Rock-solid core engagement';
        if (spineAlignment > 0.1) return '📏 Straighten your body - head to heels';
        if (leftHip && rightHip && Math.abs(leftHip - rightHip) > 10) return '⚖️ Level your hips';
        if (shoulderAlignment > 0.05) return '🤝 Keep shoulders over wrists';
        return '💪 Strong plank! Hold that position';

      case 'deadlift':
        if (formScore > 85) return '🏋️ Perfect deadlift! Excellent hip hinge';
        if (leftKnee && rightKnee) {
          const avgKnee = (leftKnee + rightKnee) / 2;
          if (avgKnee < 140) return '🦵 Keep knees slightly bent - hip hinge movement';
        }
        if (spineAlignment > 0.08) return '📏 Keep spine neutral - chest up';
        if (phase === 'down') return '⬇️ Hinge at hips, keep chest proud';
        return '💪 Good deadlift! Drive through heels';

      case 'lunge':
        if (formScore > 85) return '🦵 Perfect lunge! Great balance and depth';
        if (leftKnee && rightKnee) {
          const frontKnee = Math.min(leftKnee, rightKnee);
          if (frontKnee > 100 && phase === 'down') return '⬇️ Lower down - 90° front knee';
          if (frontKnee < 70) return '⚠️ Don\'t go too low - protect your knee';
        }
        if (spineAlignment > 0.1) return '📏 Keep torso upright';
        return '💪 Good lunge! Control the movement';

      case 'burpee':
        if (formScore > 85) return '🔥 Explosive burpee! Great full-body movement';
        if (phase === 'down') return '⬇️ Drop down, jump back';
        if (phase === 'up') return '⬆️ Jump up, reach high';
        return '💪 Keep moving! Burpee power';

      case 'mountain_climber':
        if (formScore > 85) return '🏔️ Perfect mountain climbers! Fast and controlled';
        if (spineAlignment > 0.12) return '📏 Keep plank position - core tight';
        return '💪 Drive those knees! Keep it up';

      case 'jumping_jack':
        if (formScore > 85) return '⭐ Perfect jumping jacks! Great coordination';
        if (shoulderAlignment > 0.08) return '🤝 Keep arms synchronized';
        return '💪 Good rhythm! Keep jumping';

      default:
        if (formScore > 85) return '🏆 Excellent form! Perfect alignment detected';
        if (formScore > 70) return '👍 Good posture! Minor adjustments needed';
        if (shoulderAlignment > 0.05) return '🤝 Level your shoulders for balance';
        if (spineAlignment > 0.1) return '📏 Keep spine straight and aligned';
        return '💪 Focus on proper alignment';
    }
  };

  const countReps = (
    leftKnee?: number,
    rightKnee?: number,
    leftElbow?: number,
    rightElbow?: number
  ): { count: number; detected: ExerciseType; phase: 'up' | 'down' | 'hold' | 'rest' } => {
    const now = Date.now();
    const minIntervalMs = 600; // debounce between reps
    const holdMs = 150; // require brief hold at bottom

    // Dominant angles
    const knee = smooth('knee', Math.min(leftKnee ?? 999, rightKnee ?? 999));
    const elbow = smooth('elbow', Math.min(leftElbow ?? 999, rightElbow ?? 999));

    // Determine exercise based on selectedExercise prop or auto-detect
    let detected: ExerciseType = 'unknown';
    let phase: 'up' | 'down' | 'hold' | 'rest' = 'rest';

    // Use selected exercise if provided, otherwise auto-detect
    if (selectedExercise) {
      const exerciseMap: Record<string, ExerciseType> = {
        'squat': 'squat',
        'pushup': 'pushup', 
        'push-up': 'pushup',
        'plank': 'plank',
        'deadlift': 'deadlift',
        'lunge': 'lunge',
        'burpee': 'burpee',
        'mountain_climber': 'mountain_climber',
        'jumping_jack': 'jumping_jack'
      };
      detected = exerciseMap[selectedExercise.toLowerCase()] || 'unknown';
    }

    // Exercise-specific rep counting logic
    switch (detected) {
      case 'squat':
        if (knee != null && isFinite(knee)) {
          if (kneePhaseRef.current === 'up') {
            phase = 'up';
            if (knee < 95) {
              kneePhaseRef.current = 'down';
              kneeDownSinceRef.current = now;
              phase = 'down';
            }
          } else {
            phase = 'down';
            if (knee < 90 && now - kneeDownSinceRef.current > holdMs) {
              phase = 'hold';
            }
            if (knee > 160) {
              if (now - lastRepTimeRef.current > minIntervalMs) {
                repCountRef.current += 1;
                lastRepTimeRef.current = now;
              }
              kneePhaseRef.current = 'up';
              phase = 'up';
            }
          }
        }
        break;

      case 'pushup':
        if (elbow != null && isFinite(elbow)) {
          if (elbowPhaseRef.current === 'up') {
            phase = 'up';
            if (elbow < 95) {
              elbowPhaseRef.current = 'down';
              elbowDownSinceRef.current = now;
              phase = 'down';
            }
          } else {
            phase = 'down';
            if (elbow < 90 && now - elbowDownSinceRef.current > holdMs) {
              phase = 'hold';
            }
            if (elbow > 160) {
              if (now - lastRepTimeRef.current > minIntervalMs) {
                repCountRef.current += 1;
                lastRepTimeRef.current = now;
              }
              elbowPhaseRef.current = 'up';
              phase = 'up';
            }
          }
        }
        break;

      case 'plank':
        // For plank, we don't count reps but track hold time
        phase = 'hold';
        break;

      case 'deadlift':
        // Deadlift: hip hinge movement, track hip angle
        if (knee != null && isFinite(knee)) {
          if (kneePhaseRef.current === 'up') {
            phase = 'up';
            if (knee < 150) { // slight knee bend
              kneePhaseRef.current = 'down';
              kneeDownSinceRef.current = now;
              phase = 'down';
            }
          } else {
            phase = 'down';
            if (knee > 170) { // return to standing
              if (now - lastRepTimeRef.current > minIntervalMs) {
                repCountRef.current += 1;
                lastRepTimeRef.current = now;
              }
              kneePhaseRef.current = 'up';
              phase = 'up';
            }
          }
        }
        break;

      case 'lunge':
        // Similar to squat but typically deeper knee bend
        if (knee != null && isFinite(knee)) {
          if (kneePhaseRef.current === 'up') {
            phase = 'up';
            if (knee < 90) {
              kneePhaseRef.current = 'down';
              kneeDownSinceRef.current = now;
              phase = 'down';
            }
          } else {
            phase = 'down';
            if (knee > 160) {
              if (now - lastRepTimeRef.current > minIntervalMs) {
                repCountRef.current += 1;
                lastRepTimeRef.current = now;
              }
              kneePhaseRef.current = 'up';
              phase = 'up';
            }
          }
        }
        break;

      default:
        // Auto-detect if no exercise selected
        if (knee != null && isFinite(knee) && knee < 120) {
          detected = 'squat';
        } else if (elbow != null && isFinite(elbow) && elbow < 120) {
          detected = 'pushup';
        }
        break;
    }

    return { count: repCountRef.current, detected, phase };
  };

  const initializePoseDetector = async () => {
    try {
      setIsModelLoading(true);
      
      // Initialize TensorFlow.js backend
      try {
        await tf.setBackend('webgl');
      } catch (e) {
        // Fallback if WebGL not available
        await tf.setBackend('cpu');
      }
      await tf.ready();
      setBackend(tf.getBackend());
      
      // Create pose detector with MoveNet model for better accuracy
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true
      } as poseDetection.MoveNetModelConfig;
      
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
      
      detectorRef.current = detector;
      
      console.log('[PoseDetection] Backend:', tf.getBackend());
      toast({
        title: "AI Model Loaded",
        description: `Pose detection model is ready (backend: ${tf.getBackend()})`,
      });
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      toast({
        title: "Model Loading Failed",
        description: "Could not load pose detection model",
        variant: "destructive",
      });
    } finally {
      setIsModelLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      
      // Initialize pose detector if not already done
      if (!detectorRef.current) {
        await initializePoseDetector();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: false,
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
        isActiveRef.current = true;
        
        // Start pose detection immediately since we know we're active
        console.log('[PoseDetection] Starting detection immediately after camera start');
        startPoseDetection();
        
        toast({
          title: "Camera Started",
          description: "Real-time pose detection is now active",
        });
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access for pose detection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    // Stop animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop camera stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    isActiveRef.current = false;
    setPoses([]);
    setAnalysis({
      formScore: 0,
      feedback: '',
      repCount: 0,
      phase: 'rest'
    });
    setFps(0);
    
    toast({
      title: "Camera Stopped",
      description: "Pose detection disabled",
    });
  };

  const analyzePose = (pose: Pose): ExerciseAnalysis => {
    if (!pose.keypoints || pose.keypoints.length === 0) {
      return {
        formScore: 0,
        feedback: 'No pose detected',
        repCount: 0,
        phase: 'rest'
      };
    }

    const keypoints = pose.keypoints;
    
    // Get key body points (MoveNet keypoint indices)
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    // Calculate confidence threshold
    const minConfidence = 0.2;
    const validKeypoints = keypoints.filter(kp => (kp.score || 0) > minConfidence);
    
    if (validKeypoints.length < 8) {
      return {
        formScore: 0,
        feedback: 'Please ensure your full body is visible in the camera',
        repCount: analysis.repCount,
        phase: 'rest'
      };
    }

    // Calculate body alignment and posture
    let formScore = 0;
    let feedback = '';

    // Joint angles (in degrees)
    const leftElbowAngle = angleBetween(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = angleBetween(rightShoulder, rightElbow, rightWrist);
    const leftKneeAngle = angleBetween(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = angleBetween(rightHip, rightKnee, rightAnkle);
    const leftHipAngle = angleBetween(leftShoulder, leftHip, leftKnee);
    const rightHipAngle = angleBetween(rightShoulder, rightHip, rightKnee);
    const leftShoulderAngle = angleBetween(leftElbow, leftShoulder, leftHip);
    const rightShoulderAngle = angleBetween(rightElbow, rightShoulder, rightHip);

    // Push angles into ROM buffers
    pushRom('leftKnee', leftKneeAngle);
    pushRom('rightKnee', rightKneeAngle);
    pushRom('leftElbow', leftElbowAngle);
    pushRom('rightElbow', rightElbowAngle);
    
    // Shoulder alignment (horizontal balance)
    const shoulderAlignment = leftShoulder && rightShoulder ? 
      Math.abs(leftShoulder.y - rightShoulder.y) : 0;
    
    // Hip alignment
    const hipAlignment = leftHip && rightHip ? 
      Math.abs(leftHip.y - rightHip.y) : 0;
    
    // Spine alignment (vertical posture)
    const spineAlignment = leftShoulder && leftHip ? 
      Math.abs(leftShoulder.x - leftHip.x) : 0;
    
    // Calculate overall form score
    const alignmentScore = Math.max(0, 100 - (shoulderAlignment + hipAlignment + spineAlignment) * 200);
    const confidenceScore = validKeypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / validKeypoints.length * 100;
    
    formScore = Math.round((alignmentScore + confidenceScore) / 2);
    
    // Dynamic rep counting
    const repInfo = countReps(leftKneeAngle, rightKneeAngle, leftElbowAngle, rightElbowAngle);
    const detectedExercise = repInfo.detected;
    const repCount = repInfo.count;

    // Generate exercise-specific feedback
    feedback = generateExerciseSpecificFeedback(
      detectedExercise,
      formScore,
      {
        leftKnee: leftKneeAngle,
        rightKnee: rightKneeAngle,
        leftElbow: leftElbowAngle,
        rightElbow: rightElbowAngle,
        leftHip: leftHipAngle,
        rightHip: rightHipAngle
      },
      shoulderAlignment,
      hipAlignment,
      spineAlignment,
      repInfo.phase
    );

    const result: ExerciseAnalysis = {
      formScore,
      feedback,
      repCount,
      phase: repInfo.phase,
      angles: {
        leftElbow: leftElbowAngle,
        rightElbow: rightElbowAngle,
        leftKnee: leftKneeAngle,
        rightKnee: rightKneeAngle,
        leftHip: leftHipAngle,
        rightHip: rightHipAngle,
        leftShoulder: leftShoulderAngle,
        rightShoulder: rightShoulderAngle,
      },
      rom: {
        leftKnee: romBuffersRef.current.leftKnee
          ? { min: Math.min(...romBuffersRef.current.leftKnee), max: Math.max(...romBuffersRef.current.leftKnee) }
          : undefined,
        rightKnee: romBuffersRef.current.rightKnee
          ? { min: Math.min(...romBuffersRef.current.rightKnee), max: Math.max(...romBuffersRef.current.rightKnee) }
          : undefined,
        leftElbow: romBuffersRef.current.leftElbow
          ? { min: Math.min(...romBuffersRef.current.leftElbow), max: Math.max(...romBuffersRef.current.leftElbow) }
          : undefined,
        rightElbow: romBuffersRef.current.rightElbow
          ? { min: Math.min(...romBuffersRef.current.rightElbow), max: Math.max(...romBuffersRef.current.rightElbow) }
          : undefined,
      },
      detectedExercise
    };

    // Push dynamic metrics to store
    try {
      const now = Date.now();
      addFrame({
        t: now,
        formScore: result.formScore,
        detectedExercise: result.detectedExercise || 'unknown',
        repCount: result.repCount,
        angles: result.angles,
      });
      if (result.repCount > prevReportedRepsRef.current) {
        const inc = result.repCount - prevReportedRepsRef.current;
        for (let i = 0; i < inc; i++) addRep(result.detectedExercise || 'unknown');
        // Voice: announce rep
        speak(`${result.detectedExercise || 'rep'} ${result.repCount}`);
        prevReportedRepsRef.current = result.repCount;
      }
      // Voice: announce meaningful feedback changes
      if (result.feedback && result.feedback !== lastFeedbackRef.current) {
        // Only speak if formScore is not terrible spam; and change is significant
        if (result.formScore < 95) speak(result.feedback.replace(/[\u{1F300}-\u{1FAFF}]/gu, ''));
        lastFeedbackRef.current = result.feedback;
      }
    } catch (e) {
      // swallow store errors to not break loop
    }

    return result;
  };

  const createSkeletonLines = (keypoints: any[], scaleX: number, scaleY: number) => {
    // Define skeleton connections (based on COCO pose format)
    const connections = [
      // Head connections
      [0, 1], [0, 2], [1, 3], [2, 4], // nose to eyes, eyes to ears
      // Body connections  
      [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], // shoulders to wrists
      [5, 11], [6, 12], [11, 12], // shoulders to hips, hip connection
      [11, 13], [12, 14], [13, 15], [14, 16] // hips to ankles
    ];
    
    const lines: Array<{x1: number, y1: number, x2: number, y2: number, color: string}> = [];
    
    connections.forEach(([startIdx, endIdx]) => {
      const startKp = keypoints[startIdx];
      const endKp = keypoints[endIdx];
      
      if (startKp && endKp && (startKp.score || 0) > 0.2 && (endKp.score || 0) > 0.2) {
        // Determine line color based on body part
        let color = '#10b981'; // Default green
        if (startIdx < 5 || endIdx < 5) {
          color = '#f59e0b'; // Yellow for head connections
        } else if ((startIdx >= 5 && startIdx <= 10) || (endIdx >= 5 && endIdx <= 10)) {
          color = '#06b6d4'; // Cyan for arm connections
        } else {
          color = '#a855f7'; // Purple for leg connections
        }
        
        lines.push({
          x1: startKp.x * scaleX,
          y1: startKp.y * scaleY,
          x2: endKp.x * scaleX,
          y2: endKp.y * scaleY,
          color
        });
      }
    });
    
    return lines;
  };

  const createHTMLKeypoints = (pose: Pose) => {
    const video = videoRef.current;
    if (!video || !pose.keypoints) return;

    const videoRect = video.getBoundingClientRect();
    const scaleX = videoRect.width / (video.videoWidth || 640);
    const scaleY = videoRect.height / (video.videoHeight || 480);

    const keypoints = pose.keypoints
      .filter(kp => (kp.score || 0) > 0.2)
      .map((kp, index) => ({
        x: kp.x * scaleX,
        y: kp.y * scaleY,
        confidence: kp.score || 0,
        type: index < 5 ? 'head' : index < 11 ? 'arms' : 'legs'
      }));

    setKeypointsData(keypoints);
    
    // Create skeleton lines connecting keypoints
    const lines = createSkeletonLines(pose.keypoints, scaleX, scaleY);
    setSkeletonLines(lines);
    
    console.log('[PoseDetection] HTML keypoints created:', keypoints.length, 'keypoints, skeleton lines:', lines.length);
  };

  const drawPose = async (poses: Pose[]): Promise<boolean> => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || poses.length === 0) {
      console.log('[PoseDetection] Cannot draw - missing canvas, video, or poses:', { canvas: !!canvas, video: !!video, poses: poses.length });
      return false;
    }

    // Try to get canvas context with simple retry
    let ctx: CanvasRenderingContext2D | null = null;
    
    try {
      ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log('[PoseDetection] Canvas context not available on first try');
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 50));
        ctx = canvas.getContext('2d');
      }
    } catch (error) {
      console.error('[PoseDetection] Error getting canvas context:', error);
    }
    
    if (!ctx) {
      console.error('[PoseDetection] Cannot get canvas 2D context - falling back to HTML overlay');
      return false;
    }
    
    console.log('[PoseDetection] Canvas context obtained successfully');

    // Set canvas size to match video dimensions
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    // Only resize canvas if dimensions changed to avoid flickering
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      console.log('[PoseDetection] Canvas resized to:', canvas.width, 'x', canvas.height);
    }
    
    console.log('[PoseDetection] Drawing poses on canvas:', canvas.width, 'x', canvas.height, 'poses:', poses.length);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    poses.forEach(pose => {
      const keypoints = pose.keypoints;
      const minConfidence = 0.2;
      
      // Draw keypoints
      keypoints.forEach((keypoint, index) => {
        const { x, y, score } = keypoint;
        if ((score || 0) > minConfidence) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          
          // Color based on confidence and body part
          const confidence = score || 0;
          const hue = index < 5 ? 60 : index < 11 ? 193 : 300; // Head: yellow, arms: cyan, legs: magenta
          ctx.fillStyle = `hsl(${hue}, 100%, ${50 + confidence * 30}%)`;
          ctx.fill();
          
          ctx.strokeStyle = `hsl(${hue}, 100%, 40%)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw skeleton connections (MoveNet connections)
      const connections = [
        // Face
        [0, 1], [0, 2], [1, 3], [2, 4],
        // Arms
        [5, 6], [5, 7], [6, 8], [7, 9], [8, 10],
        // Torso
        [5, 11], [6, 12], [11, 12],
        // Legs
        [11, 13], [12, 14], [13, 15], [14, 16]
      ];

      connections.forEach(([a, b]) => {
        const pointA = keypoints[a];
        const pointB = keypoints[b];
        
        if (pointA && pointB && 
            (pointA.score || 0) > minConfidence && 
            (pointB.score || 0) > minConfidence) {
          
          ctx.beginPath();
          ctx.moveTo(pointA.x, pointA.y);
          ctx.lineTo(pointB.x, pointB.y);
          
          // Color based on connection confidence
          const avgConfidence = ((pointA.score || 0) + (pointB.score || 0)) / 2;
          ctx.strokeStyle = `hsl(193, 100%, ${40 + avgConfidence * 40}%)`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });
    });
    
    return true; // Canvas drawing successful
  };

  const startPoseDetection = () => {
    console.log('[PoseDetection] Starting pose detection loop...');
    const detectPose = async () => {
      // Check both isActive state and ref for immediate updates
      const currentlyActive = isActiveRef.current;
      if (!currentlyActive) {
        console.log('[PoseDetection] Detection stopped - not active, isActiveRef:', currentlyActive);
        return;
      }
      if (!detectorRef.current || !videoRef.current) {
        console.log('[PoseDetection] Waiting for detector and video...');
        animationRef.current = requestAnimationFrame(detectPose);
        return;
      }
      
      try {
        const video = videoRef.current;
        
        // Only process if video is ready
        if (video.readyState >= 2) {
          // Calculate FPS
          const currentTime = performance.now();
          if (lastFrameTime > 0) {
            const deltaTime = currentTime - lastFrameTime;
            const currentFps = 1000 / deltaTime;
            setFps(Math.round(currentFps));
          }
          setLastFrameTime(currentTime);
          
          // Detect poses
          const poses = await detectorRef.current.estimatePoses(video, { flipHorizontal: true });
          console.log('[PoseDetection] poses detected:', poses?.length || 0, 'video ready state:', video.readyState);
          
          if (poses && poses.length > 0) {
            setPoses(poses);
            
            // Analyze the first detected pose
            const poseAnalysis = analyzePose(poses[0]);
            setAnalysis(poseAnalysis);
            
            // Draw poses on canvas (fallback to HTML overlay if canvas fails)
            const canvasSuccess = await drawPose(poses);
            console.log('[PoseDetection] Canvas success:', canvasSuccess);
            if (!canvasSuccess) {
              // Fallback: create HTML overlay keypoints
              console.log('[PoseDetection] Triggering HTML keypoint fallback');
              createHTMLKeypoints(poses[0]);
            }
          } else {
            setPoses([]);
            setAnalysis(prev => ({
              ...prev,
              formScore: 0,
              feedback: 'No person detected in frame'
            }));
            // Also clear canvas when no detection
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        } else {
          // Video not ready yet; try again next frame
          console.log('[PoseDetection] Video not ready, readyState:', video.readyState);
        }
      } catch (error) {
        console.error('Pose detection error:', error);
      }
      
      // Continue detection loop
      const stillActive = isActiveRef.current;
      if (stillActive) {
        animationRef.current = requestAnimationFrame(detectPose);
      } else {
        console.log('[PoseDetection] Stopping detection loop, isActiveRef:', stillActive);
      }
    };
    
    detectPose();
  };

  // Initialize pose detector on component mount
  useEffect(() => {
    initializePoseDetector();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Listen for NLP camera commands
  useEffect(() => {
    const handleStartCamera = () => {
      console.log('[PoseDetection] NLP command: Starting camera');
      startCamera();
    };

    const handleStopCamera = () => {
      console.log('[PoseDetection] NLP command: Stopping camera');
      stopCamera();
    };

    // Add event listeners for NLP commands
    window.addEventListener('nlp-start-camera', handleStartCamera);
    window.addEventListener('nlp-stop-camera', handleStopCamera);

    return () => {
      // Cleanup event listeners
      window.removeEventListener('nlp-start-camera', handleStartCamera);
      window.removeEventListener('nlp-stop-camera', handleStopCamera);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={640}
          height={480}
          style={{
            zIndex: 10,
            mixBlendMode: 'normal'
          }}
        />
        
        {/* HTML Keypoints Overlay (fallback when canvas fails) */}
        {(keypointsData.length > 0 || skeletonLines.length > 0) && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Skeleton Lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 15 }}>
              {skeletonLines.map((line, index) => (
                <line
                  key={index}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              ))}
            </svg>
            
            {/* Keypoints */}
            {keypointsData.map((kp, index) => (
              <div
                key={index}
                className={`absolute w-3 h-3 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 ${
                  kp.type === 'head' ? 'bg-yellow-400 border-yellow-600' :
                  kp.type === 'arms' ? 'bg-cyan-400 border-cyan-600' :
                  'bg-purple-400 border-purple-600'
                }`}
                style={{
                  left: `${kp.x}px`,
                  top: `${kp.y}px`,
                  opacity: kp.confidence,
                  zIndex: 20
                }}
              />
            ))}
          </div>
        )}
        
        {/* Overlay UI */}
        <div className="absolute top-4 left-4 space-y-2">
          <Badge variant="secondary" className="bg-card/80 backdrop-blur-sm">
            <Activity className="w-3 h-3 mr-1" />
            {isActive ? `Live Detection (${fps} FPS)` : 'Inactive'}
          </Badge>

          {isModelLoading && (
            <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
              <AlertCircle className="w-3 h-3 mr-1 animate-spin" /> Loading AI Model...
            </Badge>
          )}

          {analysis.formScore > 0 && (
            <Badge 
              variant={analysis.formScore > 70 ? 'default' : 'destructive'}
              className="bg-card/80 backdrop-blur-sm"
            >
              Form Score: {analysis.formScore}%
            </Badge>
          )}

          <Button size="sm" variant={voiceOn ? 'default' : 'outline'} onClick={() => setVoiceOn(v => !v)} className="h-8 px-3">
            {voiceOn ? (
              <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Voice On</span>
            ) : (
              <span className="flex items-center gap-2"><VolumeX className="w-4 h-4" /> Voice Off</span>
            )}
          </Button>

          {poses.length > 0 && (
            <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
              {poses.length} Person{poses.length > 1 ? 's' : ''} Detected
            </Badge>
          )}

          {analysis.angles && (
            <Card className="px-2 py-1 bg-card/80 backdrop-blur-sm text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>L. Knee: {analysis.angles.leftKnee ? Math.round(analysis.angles.leftKnee) : '-'}°</span>
                <span>R. Knee: {analysis.angles.rightKnee ? Math.round(analysis.angles.rightKnee) : '-'}°</span>
                <span>L. Elbow: {analysis.angles.leftElbow ? Math.round(analysis.angles.leftElbow) : '-'}°</span>
                <span>R. Elbow: {analysis.angles.rightElbow ? Math.round(analysis.angles.rightElbow) : '-'}°</span>
              </div>

      {/* Commands */}
      <Card className="p-3 gradient-card">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant={isListening ? 'default' : 'outline'} onClick={isListening ? stopListening : startListening}>
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          <Input
            placeholder="Type a command: start detection, voice on, reps?, knee angle"
            value={cmdText}
            onChange={(e) => setCmdText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCommand(cmdText);
                setCmdText('');
              }
            }}
          />
          <Button type="button" size="sm" onClick={() => { handleCommand(cmdText); setCmdText(''); }}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
            </Card>
          )}
        </div>

        {analysis.feedback && (
          <div className="absolute bottom-4 left-4 right-4">
            <Card className="p-3 bg-card/80 backdrop-blur-sm">
              <p className="text-sm font-medium text-center">{analysis.feedback}</p>
            </Card>
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        {!isActive ? (
          <Button 
            onClick={startCamera} 
            disabled={isLoading || isModelLoading}
            className="glow-primary"
          >
            <Camera className="w-4 h-4 mr-2" />
            {isLoading ? 'Starting Camera...' : 
             isModelLoading ? 'Loading AI Model...' : 
             'Start Real-Time Detection'}
          </Button>
        ) : (
          <Button 
            onClick={stopCamera} 
            variant="destructive"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Detection
          </Button>
        )}
      </div>

      {analysis.formScore > 0 && (
        <Card className="p-6 gradient-card">
          <h3 className="text-lg font-semibold mb-4">Real-time AI Analysis</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Form Score</span>
                <span className={analysis.formScore > 70 ? 'text-green-400' : analysis.formScore > 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {analysis.formScore}%
                </span>
              </div>
              <Progress value={analysis.formScore} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Rep Count:</span>
                <p className="font-medium">{analysis.repCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Detected Exercise:</span>
                <p className="font-medium">{analysis.detectedExercise ?? 'unknown'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Detection Status:</span>
                <p className="font-medium">
                  {poses.length > 0 ? '✅ Active' : '❌ No Detection'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Frame Rate:</span>
                <p className="font-medium">{fps} FPS</p>
              </div>
            </div>
            
            {poses.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Keypoints Detected:</span>
                <p className="font-medium">
                  {poses[0].keypoints.filter(kp => (kp.score || 0) > 0.3).length} / 17
                </p>
              </div>
            )}

            {analysis.rom && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {analysis.rom.leftKnee && (
                  <div>
                    <span className="text-muted-foreground">Left Knee ROM:</span>
                    <p className="font-medium">{Math.round(analysis.rom.leftKnee.min)}° - {Math.round(analysis.rom.leftKnee.max)}°</p>
                  </div>
                )}
                {analysis.rom.rightKnee && (
                  <div>
                    <span className="text-muted-foreground">Right Knee ROM:</span>
                    <p className="font-medium">{Math.round(analysis.rom.rightKnee.min)}° - {Math.round(analysis.rom.rightKnee.max)}°</p>
                  </div>
                )}
                {analysis.rom.leftElbow && (
                  <div>
                    <span className="text-muted-foreground">Left Elbow ROM:</span>
                    <p className="font-medium">{Math.round(analysis.rom.leftElbow.min)}° - {Math.round(analysis.rom.leftElbow.max)}°</p>
                  </div>
                )}
                {analysis.rom.rightElbow && (
                  <div>
                    <span className="text-muted-foreground">Right Elbow ROM:</span>
                    <p className="font-medium">{Math.round(analysis.rom.rightElbow.min)}° - {Math.round(analysis.rom.rightElbow.max)}°</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};