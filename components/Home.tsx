
import React from 'react';

interface HomeProps {
  onStart: () => void;
}

const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* Title Section */}
      <div className="mb-16 flex items-center gap-6">
        <span className="text-5xl">🎬</span>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Emotion-Preserving Cross-Lingual Dubbing Studio
        </h1>
      </div>

      <div className="space-y-24">
        {/* Welcome Block */}
        <section className="max-w-4xl">
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            A state-of-the-art framework for real-time expressive dubbing. This engine analyzes source vocal characteristics and synthesizes high-fidelity translations while preserving the original emotional intent.
          </p>
        </section>

        {/* Features & Pages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          {/* Features Column */}
          <section>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 flex items-center gap-4">
              <span className="text-3xl">🎯</span> System Capabilities
            </h3>
            <ul className="space-y-6 text-base font-medium text-slate-600 dark:text-slate-400">
              <li className="flex gap-4 items-start">
                <span className="text-slate-400 dark:text-slate-200 mt-1">•</span>
                <span><strong className="text-slate-900 dark:text-slate-100 block mb-1">Cross-Lingual Synthesis:</strong> Deep neural mapping into multiple target languages including Tamil and Hindi.</span>
              </li>
              <li className="flex gap-4 items-start">
                <span className="text-slate-400 dark:text-slate-200 mt-1">•</span>
                <span><strong className="text-slate-900 dark:text-slate-100 block mb-1">Neural Prosody Mapping:</strong> Extraction and replication of original pitch, speed, and emotional inflection.</span>
              </li>
              <li className="flex gap-4 items-start">
                <span className="text-slate-400 dark:text-slate-200 mt-1">•</span>
                <span><strong className="text-slate-900 dark:text-slate-100 block mb-1">Fidelity Auditing:</strong> Automated comparative metrics to ensure translation and emotional accuracy.</span>
              </li>
            </ul>
          </section>

          {/* Navigation Guide Column */}
          <section>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 flex items-center gap-4">
              <span className="text-3xl">🧩</span> Modular Workflow
            </h3>
            <ol className="space-y-8 text-base font-medium text-slate-600 dark:text-slate-400">
              <li className="flex gap-4 items-center">
                <span className="text-slate-900 dark:text-slate-100 font-black w-6">01</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎙️</span>
                  <span><strong className="text-slate-900 dark:text-slate-100">Studio</strong> - Ingestion and Synthesis</span>
                </div>
              </li>
              <li className="flex gap-4 items-center">
                <span className="text-slate-900 dark:text-slate-100 font-black w-6">02</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📈</span>
                  <span><strong className="text-slate-900 dark:text-slate-100">Metrics</strong> - Real-time system monitoring</span>
                </div>
              </li>
              <li className="flex gap-4 items-center">
                <span className="text-slate-900 dark:text-slate-100 font-black w-6">03</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <span><strong className="text-slate-900 dark:text-slate-100">Report</strong> - Synthesis fidelity analysis</span>
                </div>
              </li>
            </ol>
          </section>
        </div>
        
        <button 
          onClick={onStart}
          className="px-12 py-5 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-red-500 transition-all shadow-xl shadow-red-900/20"
        >
          Launch Studio Environment
        </button>
      </div>
    </div>
  );
};

export default Home;
