
import React, { useState, useRef, useEffect } from 'react';
import { processDubbingPipeline } from '../services/geminiService';
import { DubbingMetadata } from '../types';
import { db, auth, collection, addDoc, serverTimestamp, onAuthStateChanged, User } from '../firebase';

interface DashboardProps {
  onComplete: (metadata: DubbingMetadata, audioUrl: string, lang: string) => void;
  existingResults: DubbingMetadata | null;
  existingAudioUrl: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onComplete, existingResults, existingAudioUrl }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('Tamil');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [resultMetadata, setResultMetadata] = useState<DubbingMetadata | null>(existingResults);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(existingAudioUrl);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResultMetadata(existingResults);
    setDubbedAudioUrl(existingAudioUrl);
  }, [existingResults, existingAudioUrl]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

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
    const file = audioFile || videoFile;
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const base64Data = await fileToBase64(file);
      const response = await processDubbingPipeline(base64Data, file.type, targetLang);
      const audioUrl = response.dubbedAudioBase64 ? createWavUrl(response.dubbedAudioBase64) : '';
      
      // Save to Firestore if user is logged in
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'dubs'), {
            uid: auth.currentUser.uid,
            sourceText: response.metadata.sourceText,
            translatedText: response.metadata.translatedText,
            targetLang: targetLang,
            emotion: response.metadata.emotion,
            vocalIdentity: response.metadata.vocalIdentity,
            recommendedVoice: response.metadata.recommendedVoice,
            confidence: response.metadata.confidence,
            audioUrl: audioUrl, // In a real app, we'd upload to Storage first
            createdAt: serverTimestamp()
          });
        } catch (fsErr) {
          console.error("Error saving to Firestore:", fsErr);
        }
      }

      setResultMetadata(response.metadata);
      setDubbedAudioUrl(audioUrl);
      onComplete(response.metadata, audioUrl, targetLang);
    } catch (err: any) {
      console.error("Pipeline Error:", err);
      // Extract the most helpful error message possible
      const errorMessage = err?.message || "An unexpected error occurred during neural processing.";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
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
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-500 text-sm font-bold flex items-start gap-4">
              <span className="mt-0.5">⚠️</span>
              <div>
                <div className="font-black uppercase tracking-widest text-[10px] mb-1">Processing Error</div>
                {error}
              </div>
            </div>
          )}
          {!user && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl text-amber-600 dark:text-amber-500 text-sm font-bold flex items-start gap-4">
              <span className="mt-0.5">💡</span>
              <div>
                <div className="font-black uppercase tracking-widest text-[10px] mb-1">Guest Mode</div>
                Sign in to save your dubbing history to the database.
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
          </div>
        </div>

        <div className="space-y-12">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="bg-red-500 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white">OP</div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Output Preview</h2>
          </div>
          {resultMetadata ? (
            <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/60 rounded-[3rem] p-10 space-y-8 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Emotion</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">{resultMetadata.emotion}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Voice Profile</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">{resultMetadata.recommendedVoice}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Confidence</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{(resultMetadata.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Identity</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{resultMetadata.vocalIdentity}</div>
                  </div>
                </div>
               <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <div className="text-[10px] text-red-500 uppercase mb-3 font-black tracking-widest">Translation Context</div>
                  <p className="text-base italic text-slate-800 dark:text-slate-100 font-medium leading-relaxed">"{resultMetadata.translatedText}"</p>
               </div>
               {dubbedAudioUrl && (
                 <div className="pt-4">
                   <audio controls src={dubbedAudioUrl} className="w-full filter dark:invert" />
                 </div>
               )}
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
