
import React, { useState, useEffect } from 'react';
import { AppView, DubbingMetadata } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';
import DubbingReport from './components/DubbingReport';
import History from './components/History';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.WORKSPACE);
  const [isDark, setIsDark] = useState(true);
  
  // Shared State for Dubbing Results
  const [latestResults, setLatestResults] = useState<DubbingMetadata | null>(null);
  const [latestAudioUrl, setLatestAudioUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('Tamil');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleDubbingComplete = (metadata: DubbingMetadata, audioUrl: string, lang: string) => {
    setLatestResults(metadata);
    setLatestAudioUrl(audioUrl);
    setTargetLang(lang);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.WORKSPACE:
        return (
          <Dashboard 
            onComplete={handleDubbingComplete} 
            existingResults={latestResults} 
            existingAudioUrl={latestAudioUrl}
          />
        );
      case AppView.REALTIME:
        return <Analysis results={latestResults} />;
      case AppView.ANALYSIS:
        return (
          <DubbingReport 
            results={latestResults} 
            audioUrl={latestAudioUrl} 
            targetLang={targetLang}
          />
        );
      case AppView.HISTORY:
        return <History />;
      default:
        return (
          <Dashboard 
            onComplete={handleDubbingComplete} 
            existingResults={latestResults} 
            existingAudioUrl={latestAudioUrl}
          />
        );
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      setView={setCurrentView}
      isDark={isDark}
    >
      {renderView()}
    </Layout>
  );
};

export default App;
