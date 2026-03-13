
import React, { useState, useEffect } from 'react';
import { AppView, DubbingMetadata } from './types';
import Layout from './components/Layout';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';
import DubbingReport from './components/DubbingReport';
import History from './components/History';
import { auth, onAuthStateChanged, User, signInWithGoogle, logout } from './src/firebase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Shared State for Dubbing Results
  const [latestResults, setLatestResults] = useState<DubbingMetadata | null>(null);
  const [latestAudioUrl, setLatestAudioUrl] = useState<string | null>(null);
  const [latestVideoUrl, setLatestVideoUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('Tamil');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleDubbingComplete = (metadata: DubbingMetadata, audioUrl: string, lang: string, videoUrl?: string) => {
    setLatestResults(metadata);
    setLatestAudioUrl(audioUrl);
    setLatestVideoUrl(videoUrl || null);
    setTargetLang(lang);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.HOME:
        return <Home onStart={() => setCurrentView(AppView.WORKSPACE)} />;
      case AppView.WORKSPACE:
        return (
          <Dashboard 
            onComplete={handleDubbingComplete} 
            existingResults={latestResults} 
            existingAudioUrl={latestAudioUrl}
            existingVideoUrl={latestVideoUrl}
          />
        );
      case AppView.REALTIME:
        return <Analysis results={latestResults} />;
      case AppView.ANALYSIS:
        return (
          <DubbingReport 
            results={latestResults} 
            audioUrl={latestAudioUrl} 
            videoUrl={latestVideoUrl}
            targetLang={targetLang}
          />
        );
      case AppView.HISTORY:
        return <History onSelectProject={(proj) => {
          setLatestResults(proj.metadata || null);
          setLatestAudioUrl(proj.dubbedAudioUrl || null);
          setLatestVideoUrl(proj.dubbedVideoUrl || null);
          setTargetLang(proj.targetLang);
          setCurrentView(AppView.ANALYSIS);
        }} />;
      default:
        return <Home onStart={() => setCurrentView(AppView.WORKSPACE)} />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      setView={setCurrentView}
      isDark={isDark}
      user={user}
      onLogin={signInWithGoogle}
      onLogout={logout}
    >
      {!isAuthReady ? (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0d1117]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      ) : renderView()}
    </Layout>
  );
};

export default App;
