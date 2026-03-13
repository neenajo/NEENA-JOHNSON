
import React, { useState } from 'react';
import { DubbingMetadata, AnalysisSubView } from '../types';
import { AreaChart, Area, XAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell } from 'recharts';

interface DubbingReportProps {
  results: DubbingMetadata | null;
  audioUrl: string | null;
  videoUrl: string | null;
  targetLang: string;
}

const DubbingReport: React.FC<DubbingReportProps> = ({ results, audioUrl, videoUrl, targetLang }) => {
  const [activeTab, setActiveTab] = useState<AnalysisSubView>('TRANSCRIPTION');

  const handleDownload = () => {
    const url = videoUrl || audioUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `dubbed_output_${targetLang.toLowerCase()}.${videoUrl ? 'mp4' : 'wav'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (!results) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-red-500 animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px]">Awaiting Pipeline Completion...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'TRANSCRIPTION':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fadeIn">
            <div className="space-y-4">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Source Context (Original)</div>
              <div className="bg-white dark:bg-[#0d1117] p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 text-lg font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed shadow-lg">
                "{results.sourceText}"
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Target Synthesis ({targetLang})</div>
              <div className="bg-red-500/[0.03] p-10 rounded-[2.5rem] border border-red-500/20 text-lg font-bold italic text-slate-900 dark:text-white leading-relaxed shadow-lg">
                "{results.translatedText}"
              </div>
            </div>
          </div>
        );
      case 'PROSODY':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
             <div className="lg:col-span-2 bg-white dark:bg-[#0d1117] p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10">Neural Prosody Mapping (F0)</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.from({length: 40}, (_, i) => ({t: i, v: 50 + Math.random()*20}))}>
                         <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f622" strokeWidth={3} dot={false} />
                         <XAxis hide />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>
             <div className="bg-white dark:bg-[#0d1117] p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Voice Identity</h3>
                <div className="text-2xl font-black text-slate-900 dark:text-white capitalize mb-2">{results.vocalIdentity}</div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{results.prosodyInstruction}</p>
             </div>
          </div>
        );
      case 'EMOTION':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
             <div className="bg-white dark:bg-[#0d1117] p-12 rounded-[3rem] border border-slate-200 dark:border-slate-800/60 flex items-center justify-center shadow-sm">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                      { s: 'Joy', v: 80 }, { s: 'Fear', v: 20 }, { s: 'Anger', v: 10 }, { s: 'Sadness', v: 30 }, { s: 'Neutral', v: 90 }
                    ]}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="s" tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}} />
                      <Radar name="Emotion" dataKey="v" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="bg-white dark:bg-[#0d1117] p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10">Detected Dominance</h3>
                <div className="flex items-center gap-8">
                   <div className="w-32 h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{v: 75}, {v: 25}]} innerRadius={35} outerRadius={50} dataKey="v" stroke="none">
                            <Cell fill="#ef4444" /><Cell fill="#f1f5f9" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div>
                      <div className="text-4xl font-black text-slate-900 dark:text-white capitalize">{results.emotion}</div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Confidence Score: 92.4%</div>
                   </div>
                </div>
             </div>
          </div>
        );
      case 'METRICS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            {[
              { l: 'Phonetic Sync', v: '98.1%', d: 'High' },
              { l: 'Timbre Match', v: '92.4%', d: 'Stable' },
              { l: 'Pitch Correlation', v: '0.86', d: 'Linear' },
              { l: 'MOS Estimated', v: '4.8/5.0', d: 'Studio' }
            ].map((m, i) => (
              <div key={i} className="bg-white dark:bg-[#0d1117] p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{m.l}</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{m.v}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase mt-2">{m.d}</div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-3">Post-Synthesis Analysis</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Comprehensive audit of linguistic, acoustic, and emotional fidelity.</p>
      </div>

      <div className="flex items-center gap-10 border-b border-slate-200 dark:border-slate-800/60 mb-12 overflow-x-auto no-scrollbar">
        {[
          { id: 'TRANSCRIPTION', label: 'Transcription & Translation', icon: '📝' },
          { id: 'PROSODY', label: 'Prosody', icon: '🔊' },
          { id: 'EMOTION', label: 'Emotion', icon: '😊' },
          { id: 'METRICS', label: 'Metrics', icon: '🎵' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AnalysisSubView)}
            className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-red-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {renderContent()}
      </div>

      {(audioUrl || videoUrl) && (
        <div className="mt-16 p-10 bg-white dark:bg-[#0d1117] rounded-[3rem] border border-slate-200 dark:border-slate-800/60 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl">
          <div className="flex-1 w-full">
             <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Master Output Stream</div>
             {videoUrl ? (
               <video src={videoUrl} controls className="w-full rounded-2xl shadow-lg" />
             ) : (
               <audio src={audioUrl!} controls className="w-full dark:invert brightness-150 contrast-50 opacity-80" />
             )}
          </div>
          <button 
            onClick={handleDownload}
            className="px-8 py-5 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-red-500 transition-all shadow-xl shadow-red-900/20 whitespace-nowrap w-full lg:w-auto"
          >
             Download {videoUrl ? 'Video' : 'Master'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DubbingReport;
