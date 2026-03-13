import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../src/firebase';
import { DubbingProject } from '../types';

interface HistoryProps {
  onSelectProject: (project: DubbingProject) => void;
}

const History: React.FC<HistoryProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<DubbingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs: DubbingProject[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as DubbingProject);
      });
      setProjects(projs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Snapshot Error:", err);
      setError("Failed to load project history. Please check your permissions.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
        <div className="text-6xl opacity-20">🔒</div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Authentication Required</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">Please sign in to view your project history and save your neural dubbing results.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">Project History</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base font-medium">Your previous neural dubbing and lip-sync projects.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-500 text-sm font-bold mb-8">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-20 text-center space-y-4">
          <div className="text-4xl opacity-20">📜</div>
          <div className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">No projects found yet</div>
          <p className="text-slate-500 text-sm">Start a new dubbing project in the workspace to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => project.status === 'completed' && onSelectProject(project)}
              className={`bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-red-500/30 transition-all cursor-pointer group flex flex-col h-full ${project.status !== 'completed' ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-50 dark:bg-[#1c2128] px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                  {project.targetLang}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                  project.status === 'processing' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {project.status}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-2">
                  {project.metadata?.sourceText || 'Untitled Project'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic line-clamp-2">
                  "{project.metadata?.translatedText || 'Processing translation...'}"
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {project.createdAt?.toDate().toLocaleDateString()}
                </div>
                <div className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
