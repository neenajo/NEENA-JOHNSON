
import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, orderBy, onSnapshot, onAuthStateChanged, User } from '../firebase';
import { DubbingMetadata } from '../types';

interface HistoryRecord extends DubbingMetadata {
  id: string;
  createdAt: any;
  targetLang: string;
  audioUrl: string;
}

const History: React.FC = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRecords([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'dubs'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HistoryRecord[];
      setRecords(docs);
      setLoading(false);
    }, (error) => {
      console.error("History fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin text-4xl">🌀</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">Dubbing History</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base font-medium">Your previous neural dubbing operations.</p>
      </div>

      {records.length === 0 ? (
        <div className="bg-white dark:bg-[#11141d] border border-slate-200 dark:border-slate-800 rounded-3xl p-20 text-center">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-slate-500 font-bold uppercase tracking-widest text-sm">No records found yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {records.map(record => (
            <div key={record.id} className="bg-white dark:bg-[#11141d] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-red-500/30 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">{record.targetLang}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{record.sourceText}</div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : 'Recent'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-[#0d1117] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Emotion</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">{record.emotion}</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0d1117] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Voice</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{record.recommendedVoice}</div>
                </div>
              </div>

              {record.audioUrl && (
                <audio controls src={record.audioUrl} className="w-full h-8 filter dark:invert opacity-60 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
