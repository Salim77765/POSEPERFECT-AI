import { create } from 'zustand';

export type AngleSnapshot = {
  leftKnee?: number;
  rightKnee?: number;
  leftElbow?: number;
  rightElbow?: number;
  leftHip?: number;
  rightHip?: number;
  leftShoulder?: number;
  rightShoulder?: number;
};

export type ExerciseType = 'squat' | 'pushup' | 'plank' | 'deadlift' | 'lunge' | 'burpee' | 'mountain_climber' | 'jumping_jack' | 'unknown';

export type FrameSample = {
  t: number; // timestamp ms
  formScore: number;
  detectedExercise: ExerciseType;
  repCount: number;
  angles?: AngleSnapshot;
};

type MetricsState = {
  frames: FrameSample[];
  totalReps: number;
  repsByExercise: Record<ExerciseType, number>;
  addFrame: (sample: FrameSample) => void;
  addRep: (exercise: ExerciseType) => void;
  resetSession: () => void;
};

const initialRepsByExercise: Record<ExerciseType, number> = {
  squat: 0,
  pushup: 0,
  plank: 0,
  deadlift: 0,
  lunge: 0,
  burpee: 0,
  mountain_climber: 0,
  jumping_jack: 0,
  unknown: 0
};

export const useMetricsStore = create<MetricsState>((set) => ({
  frames: [],
  totalReps: 0,
  repsByExercise: { ...initialRepsByExercise },
  addFrame: (sample) =>
    set((s) => ({
      frames: [...s.frames, sample].slice(-1800), // keep ~1 hour at 2s sampling if needed
    })),
  addRep: (exercise) =>
    set((s) => ({
      totalReps: s.totalReps + 1,
      repsByExercise: { ...s.repsByExercise, [exercise]: (s.repsByExercise[exercise] || 0) + 1 },
    })),
  resetSession: () => set({ frames: [], totalReps: 0, repsByExercise: { ...initialRepsByExercise } }),
}));
