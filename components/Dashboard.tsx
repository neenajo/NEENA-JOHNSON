
import React, { useState, useRef, useEffect } from 'react';
import { analyzeMediaMetadata, synthesizeDubbedAudio, generateDubbedVideo, pollOperation, downloadVideoContent } from '../services/geminiService';
import { DubbingMetadata } from '../types';
import { db, auth, collection, addDoc, updateDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../src/firebase';

interface DashboardProps {
  onComplete: (metadata: DubbingMetadata, audioUrl: string, lang: string, videoUrl?: string) => void;
  existingResults: DubbingMetadata | null;
  existingAudioUrl: string | null;
  existingVideoUrl: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onComplete, existingResults, existingAudioUrl, existingVideoUrl }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('Tamil');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(true);
  
  const [resultMetadata, setResultMetadata] = useState<DubbingMetadata | null>(existingResults);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(existingAudioUrl);
  const [dubbedVideoUrl, setDubbedVideoUrl] = useState<string | null>(existingVideoUrl);
  const [error, setError] = useState<string | null>(null);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResultMetadata(existingResults);
    setDubbedAudioUrl(existingAudioUrl);
    setDubbedVideoUrl(existingVideoUrl);
  }, [existingResults, existingAudioUrl, existingVideoUrl]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const captureFirstFrame = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.play().then(() => video.pause());

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.5, video.duration / 2);
      };

      video.onseeked = () => {
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            reject(new Error("Video dimensions are zero."));
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          URL.revokeObjectURL(video.src);
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };

      video.onerror = () => reject(new Error("Failed to load video for frame capture."));
      setTimeout(() => reject(new Error("Frame capture timed out.")), 10000);
    });
  };

  const createWavUrl = (base64Pcm: string): string => {
    const binaryString = atob(base64Pcm);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 32 + bytes.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, bytes.length, true);
    const blob = new Blob([header, bytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const runPipeline = async () => {
    const file = videoFile || audioFile;
    if (!file) return;
    
    let projectId: string | null = null;
    
    setIsProcessing(true);
    setProcessingStep('Initializing project...');
    setError(null);
    setResultMetadata(null);
    setDubbedAudioUrl(null);
    setDubbedVideoUrl(null);

    try {
      // Create initial project in Firestore if user is logged in
      if (auth.currentUser) {
        try {
          const docRef = await addDoc(collection(db, 'projects'), {
            userId: auth.currentUser.uid,
            targetLang,
            status: 'processing',
            createdAt: Timestamp.now()
          });
          projectId = docRef.id;
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, 'projects');
        }
      }

      setProcessingStep('Analyzing media content...');
      const base64Data = await fileToBase64(file);
      
      if (file.size > 30 * 1024 * 1024) {
        throw new Error("File is too large (>30MB). Please upload a shorter clip.");
      }

      // Step 1: Get Metadata (Translation, Emotion, etc.)
      const metadata = await analyzeMediaMetadata(base64Data, file.type, targetLang);
      setResultMetadata(metadata); // Optimistic UI: Show translation immediately
      
      // Step 2: Parallel Execution
      setProcessingStep('Neural Synthesis...');
      
      // Kick off Audio Synthesis
      const audioPromise = synthesizeDubbedAudio(metadata, targetLang).then(async base64 => {
        const url = createWavUrl(base64);
        setDubbedAudioUrl(url);
        
        // If no video, we can finish early
        if (!videoFile) {
          if (projectId) {
            await updateDoc(doc(db, 'projects', projectId), {
              status: 'completed',
              metadata: metadata,
              dubbedAudioUrl: url
            });
          }
          onComplete(metadata, url, targetLang);
          setIsProcessing(false);
        }
        return url;
      });

      // Kick off Video Generation (if video exists)
      if (videoFile) {
        setProcessingStep('Generating Lip-Sync Video...');
        const firstFrame = await captureFirstFrame(videoFile);
        let operation = await generateDubbedVideo(
          firstFrame, 
          metadata.translatedText, 
          metadata.emotion, 
          targetLang
        );

        const reassuringMessages = [
          "Analyzing facial landmarks...",
          "Synthesizing lip-sync patterns...",
          "Rendering neural frames...",
          "Polishing output..."
        ];

        let attempts = 0;
        const maxAttempts = 120; 
        
        while (!operation.done && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 4000));
          operation = await pollOperation(operation);
          attempts++;
          
          const msgIndex = Math.floor(attempts / 4) % reassuringMessages.length;
          setProcessingStep(`Video Rendering... (${attempts * 4}s)`);
          setProgressMessage(reassuringMessages[msgIndex]);
        }

        if (!operation.done) throw new Error("Video generation timed out. Audio is ready below.");

        if (operation.error) {
          throw new Error(`Video Engine Error: ${operation.error.message}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          setProgressMessage("Finalizing video...");
          const finalVideoUrl = await downloadVideoContent(downloadLink);
          setDubbedVideoUrl(finalVideoUrl);
          
          if (projectId) {
            const finalAudioUrl = await audioPromise;
            await updateDoc(doc(db, 'projects', projectId), {
              status: 'completed',
              metadata: metadata,
              dubbedAudioUrl: finalAudioUrl,
              dubbedVideoUrl: finalVideoUrl
            });
          }
          const finalAudioUrl = await audioPromise;
          onComplete(metadata, finalAudioUrl, targetLang, finalVideoUrl);
        }
      }
    } catch (err: any) {
      console.error("Pipeline Error:", err);
      
      // Update project status to error
      if (projectId) {
        try {
          await updateDoc(doc(db, 'projects', projectId), {
            status: 'error'
          });
        } catch (e) {
          console.error("Failed to update error status:", e);
        }
      }

      let errorMessage = err?.message || "An unexpected error occurred.";
      if (errorMessage.includes('Invalid video data')) {
        errorMessage = "The neural engine rejected the video data. Try a shorter MP4 clip with clear visuals.";
      }
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "Neural Quota Exceeded: You've reached the platform's rate limit. Please wait a few minutes for the quota to reset or check your billing plan.";
      }
      if (errorMessage.includes('Requested entity was not found')) {
        setHasApiKey(false);
        errorMessage = "Your selected API key is invalid or has expired. Please select a valid paid Google Cloud API key.";
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const UploadZone = ({ title, sub, refObj, file, setFile, accept }: any) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
        <span>📁</span> {title}
      </div>
      <div 
        onClick={() => refObj.current?.click()}
        className={`bg-white dark:bg-[#11141d] border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:border-red-500/50 transition-all group ${file ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}
      >
        <input type="file" ref={refObj} onChange={(e) => setFile(e.target.files?.[0] || null)} hidden accept={accept} />
        <div className="flex items-center gap-5">
          <div className="bg-slate-50 dark:bg-[#1c2128] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 group-hover:scale-105 transition-transform">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px] md:max-w-xs">{file ? file.name : 'Select or drag file'}</div>
            <div className="text-[11px] text-slate-400 font-semibold tracking-wide mt-1">{sub}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="mb-20">
        <div className="flex items-center space-x-5 mb-4">
          <span className="text-4xl">🎙️</span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Dubbing Workspace</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-2xl leading-relaxed">
          Upload audio or video, select target language, and create dubbed content with neural emotion preservation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 xl:gap-32">
        <div className="space-y-12">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <span className="text-2xl">⚙️</span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Input Settings</h2>
          </div>
          {!hasApiKey && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl text-amber-600 text-sm font-bold">
              <div className="font-black uppercase tracking-widest text-[10px] mb-2">API Key Required</div>
              <p className="mb-4 opacity-80">Veo video generation requires a paid Google Cloud API key for lip-sync features.</p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleSelectKey}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors"
                >
                  Select Key
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] underline opacity-60 hover:opacity-100"
                >
                  Billing Docs
                </a>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-500 text-sm font-bold flex items-start gap-4">
              <span className="mt-0.5">⚠️</span>
              <div>
                <div className="font-black uppercase tracking-widest text-[10px] mb-1">Processing Error</div>
                {error}
              </div>
            </div>
          )}
          <div className="space-y-10">
            <UploadZone title="Audio" sub="WAV, MP3" refObj={audioInputRef} file={audioFile} setFile={setAudioFile} accept="audio/*" />
            <UploadZone title="Video" sub="MP4" refObj={videoInputRef} file={videoFile} setFile={setVideoFile} accept="video/*" />
          </div>
          <div className="space-y-10 pt-6">
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full bg-white dark:bg-[#11141d] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-5 rounded-2xl appearance-none outline-none shadow-sm">
              <option>Tamil</option>
              <option>Hindi</option>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
            <button onClick={runPipeline} disabled={(!audioFile && !videoFile) || isProcessing} className={`w-full py-6 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${(!audioFile && !videoFile) || isProcessing ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600' : 'bg-red-600 text-white shadow-2xl shadow-red-900/40 hover:bg-red-500 active:scale-[0.98]'}`}>
              {isProcessing ? 'Neural Processing...' : 'Start Dubbing'}
            </button>
            {isProcessing && processingStep && (
              <div className="text-center space-y-2 animate-pulse">
                <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">{processingStep}</div>
                {progressMessage && (
                  <div className="text-[11px] text-slate-400 font-medium italic">"{progressMessage}"</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-12">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="bg-red-500 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white">OP</div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Output Preview</h2>
          </div>
          
          {resultMetadata ? (
            <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/60 rounded-[3rem] p-10 space-y-8 shadow-xl">
               
               {/* Video Section */}
               {dubbedVideoUrl ? (
                 <div className="space-y-4">
                   <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Neural Lip-Sync Video</div>
                   <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                     <video controls src={dubbedVideoUrl} className="w-full aspect-video object-cover" />
                   </div>
                 </div>
               ) : videoFile && isProcessing && (
                 <div className="aspect-video bg-slate-50 dark:bg-[#11141d] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Rendering...</div>
                 </div>
               )}

               {/* Audio Section - Always show if ready */}
               {dubbedAudioUrl && (
                 <div className="p-8 bg-slate-50 dark:bg-[#11141d] rounded-[2rem] border border-slate-100 dark:border-slate-800/50 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-red-500 uppercase font-black tracking-widest">Dubbed Audio Master</div>
                      <a 
                        href={dubbedAudioUrl} 
                        download={`dubbed_audio_${targetLang.toLowerCase()}.wav`}
                        className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
                      >
                        <span>⬇️</span> Download WAV
                      </a>
                    </div>
                    <audio controls src={dubbedAudioUrl} className="w-full filter dark:invert" />
                 </div>
               )}

               {/* Metadata Section */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Emotion</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">{resultMetadata.emotion}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Confidence</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{(resultMetadata.confidence * 100).toFixed(1)}%</div>
                  </div>
               </div>

               <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <div className="text-[10px] text-red-500 uppercase mb-3 font-black tracking-widest">Translation Context</div>
                  <p className="text-base italic text-slate-800 dark:text-slate-100 font-medium leading-relaxed">"{resultMetadata.translatedText}"</p>
               </div>
            </div>
          ) : (
            <div className="min-h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-xs gap-4">
              <span className="text-3xl opacity-20">🎚️</span>
              {isProcessing ? 'Thinking...' : 'Awaiting neural synthesis...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
