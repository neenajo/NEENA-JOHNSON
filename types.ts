
export enum AppView {
  HOME = 'HOME',
  WORKSPACE = 'WORKSPACE',
  REALTIME = 'REALTIME',
  ANALYSIS = 'ANALYSIS',
  HISTORY = 'HISTORY'
}

export interface DubbingProject {
  id: string;
  userId: string;
  sourceVideoUrl?: string;
  targetLang: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  metadata?: DubbingMetadata;
  dubbedAudioUrl?: string;
  dubbedVideoUrl?: string;
  createdAt: any;
}

export type RealTimeSubView = 'LIVE_METRICS' | 'AUDIO_ANALYSIS' | 'PROCESSING_STATS';
export type AnalysisSubView = 'TRANSCRIPTION' | 'PROSODY' | 'EMOTION' | 'METRICS';

export type PipelineStepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface PipelineStep {
  id: string;
  label: string;
  status: PipelineStepStatus;
  detail: string;
}

export interface DubbingMetadata {
  sourceText: string;
  translatedText: string;
  gender: 'male' | 'female';
  emotion: string;
  vocalIdentity: string;
  prosodyInstruction: string;
  confidence: number;
  videoUrl?: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
