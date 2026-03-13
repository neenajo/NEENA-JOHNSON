
import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { RealTimeSubView, DubbingMetadata } from '../types';

interface AnalysisProps {
  results: DubbingMetadata | null;
}

const Analysis: React.FC<AnalysisProps> = ({ results }) => {
  const [activeTab, setActiveTab] = useState<RealTimeSubView>('LIVE_METRICS');

  const pitchData = Array.from({ length: 50 }, (_, i) => ({ 
    time: i, 
    val: Math.sin(i * 0.3) * 10 + 100 + Math.random() * 5 
  }));

  const freqData = Array.from({ length: 24 }, (_, i) => ({
    name: i,
    val: Math.random() * 80 + 20
  }));

  const renderContent = () => {
    switch (activeTab) {
      case 'LIVE_METRICS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            {[
              { label: 'CPU Load', value: '34.2%', trend: '+0.4%', color: 'text-blue-500' },
              { label: 'Neural Latency', value: '142ms', trend: '-12ms', color: 'text-emerald-500' },
              { label: 'Frame Sync', value: '99.8%', trend: 'Stable', color: 'text-red-500' },
              { label: 'Memory Buffer', value: '2.4GB', trend: 'Active', color: 'text-amber-500' }
            ].map((m, i) => (
              <div key={i} className="bg-white dark:bg-[#0d1117] p-8 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{m.label}</div>
                <div className={`text-4xl font-black mb-1 ${m.color}`}>{m.value}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase mt-2">{m.trend}</div>
              </div>
            ))}
            <div className="lg:col-span-4 bg-white dark:bg-[#0d1117] p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 mt-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10">Real-Time Prosody Stream</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pitchData}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="val" stroke="#ef4444" fill="url(#lineGrad)" strokeWidth={3} dot={false} isAnimationActive={false} />
                    <XAxis hide />
                    <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      case 'AUDIO_ANALYSIS':
        return (
          <div className="bg-white dark:bg-[#0d1117] p-12 rounded-[3rem] border border-slate-200 dark:border-slate-800/60 animate-fadeIn shadow-sm">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-12">Spectral Energy Density (Real-Time)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqData}>
                  <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                    {freqData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ef4444' : '#e2e8f0'} />
                    ))}
                  </Bar>
                  <XAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'PROCESSING_STATS':
        return (
          <div className="bg-white dark:bg-[#0d1117] p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 animate-fadeIn font-mono text-xs shadow-sm">
             <div className="space-y-4">
               {[
                 { t: '12:04:01', msg: 'Neural Engine initializing components...', status: 'OK' },
                 { t: '12:04:02', msg: 'Whisper-v3 ASR context loaded (English)', status: 'OK' },
                 { t: '12:04:04', msg: 'NLLB-200 Translation stream opened', status: 'WAIT' },
                 { t: '12:04:08', msg: 'Emotional vector extraction complete', status: 'OK' },
                 { t: '12:04:12', msg: 'Synthesis frames generating at 24fps', status: 'ACT' }
               ].map((log, i) => (
                 <div key={i} className="flex items-center gap-6 py-3 border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                    <span className="text-slate-400 dark:text-slate-600">{log.t}</span>
                    <span className="text-slate-700 dark:text-slate-300 flex-1">{log.msg}</span>
                    <span className={`font-black ${log.status === 'OK' ? 'text-emerald-500' : 'text-blue-500'}`}>{log.status}</span>
                 </div>
               ))}
             </div>
          </div>
        );
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-3xl">📈</span>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Real-Time Processing Metrics</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Monitor live metrics and performance during dubbing processing.</p>
      </div>

      <div className="flex items-center gap-10 border-b border-slate-200 dark:border-slate-800/60 mb-12 overflow-x-auto no-scrollbar">
        {[
          { id: 'LIVE_METRICS', label: 'Live Metrics', icon: '📊' },
          { id: 'AUDIO_ANALYSIS', label: 'Audio Analysis', icon: '🔊' },
          { id: 'PROCESSING_STATS', label: 'Processing Stats', icon: '⏱️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as RealTimeSubView)}
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

      {renderContent()}
    </div>
  );
};

export default Analysis;
