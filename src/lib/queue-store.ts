import { Participant, DAILY_QUOTA } from './queue-types';

const STORAGE_KEY = 'viola_queue_data';

export const getQueueData = (): { participants: Participant[]; date: string } => {
  if (typeof window === 'undefined') return { participants: [], date: '' };
  
  const stored = localStorage.getItem(STORAGE_KEY);
  const today = new Date().toISOString().split('T')[0];
  
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.date === today) {
      return parsed;
    }
  }
  
  // Reset for a new day
  const newData = { participants: [], date: today };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  return newData;
};

export const saveQueueData = (participants: Participant[]) => {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ participants, date: today }));
  // Dispatch custom event for cross-tab sync
  window.dispatchEvent(new Event('viola_storage_update'));
};

export const addParticipant = (data: Omit<Participant, 'id' | 'queueNumber' | 'timestamp' | 'status'>): Participant | null => {
  const { participants } = getQueueData();
  if (participants.length >= DAILY_QUOTA) return null;

  const nextNumber = participants.length + 1;
  const queueNumber = `A${nextNumber.toString().padStart(2, '0')}`;
  
  const newParticipant: Participant = {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    queueNumber,
    timestamp: new Date().toISOString(),
    status: 'Waiting',
  };

  saveQueueData([...participants, newParticipant]);
  return newParticipant;
};

export const updateParticipantStatus = (id: string, status: Participant['status'], staffName?: string) => {
  const { participants } = getQueueData();
  const updated = participants.map(p => {
    if (p.id === id) {
      const now = new Date().toISOString();
      return { 
        ...p, 
        status,
        ...(status === 'Being Served' ? { serveStartTime: now, staffName: staffName || 'Admin VIOLA' } : {}),
        ...(status === 'Finished' ? { serveEndTime: now } : {}),
      };
    }
    return p;
  });
  saveQueueData(updated);
};
