import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  getDoc, 
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  Participant, 
  ServiceType, 
  DAILY_QUOTA, 
  SystemSettings, 
  DEFAULT_ZOOM_LINK, 
  DEFAULT_CLERKS 
} from './queue-types';

// State lokal untuk sinkronisasi sinkron (agar UI tidak perlu refactor besar)
let cachedParticipants: Participant[] = [];
let cachedSettings: SystemSettings = { 
  dailyQuota: DAILY_QUOTA, 
  zoomLink: DEFAULT_ZOOM_LINK, 
  clerks: DEFAULT_CLERKS 
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

// Inisialisasi Listeners Real-time
if (typeof window !== 'undefined') {
  const today = getTodayDate();
  
  // Listen Participants
  const q = query(collection(db, 'participants'), where('date', '==', today));
  onSnapshot(q, (snapshot) => {
    cachedParticipants = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Participant)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    window.dispatchEvent(new Event('viola_storage_update'));
  });

  // Listen Settings
  onSnapshot(doc(db, 'settings', 'config'), (doc) => {
    if (doc.exists()) {
      cachedSettings = doc.data() as SystemSettings;
    } else {
      // Initialize default settings in Firestore if not exist
      setDoc(doc.ref, { 
        dailyQuota: DAILY_QUOTA, 
        zoomLink: DEFAULT_ZOOM_LINK, 
        clerks: DEFAULT_CLERKS 
      });
    }
    window.dispatchEvent(new Event('viola_storage_update'));
  });
}

export const getQueueData = (): { participants: Participant[]; date: string } => {
  return { participants: cachedParticipants, date: getTodayDate() };
};

export const getSettings = (): SystemSettings => {
  return cachedSettings;
};

export const saveSettings = async (settings: SystemSettings) => {
  await setDoc(doc(db, 'settings', 'config'), settings);
};

export const clearQueueData = async () => {
  const today = getTodayDate();
  const q = query(collection(db, 'participants'), where('date', '==', today));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};

export const addParticipant = async (data: Omit<Participant, 'id' | 'queueNumber' | 'timestamp' | 'status'>): Promise<{ success: boolean; error?: string; participant?: Participant }> => {
  const today = getTodayDate();
  
  // Pastikan kita punya data pengaturan terbaru
  let settings = cachedSettings;
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
    if (settingsDoc.exists()) {
      settings = settingsDoc.data() as SystemSettings;
    }
  } catch (e) {
    console.warn("Using cached settings due to fetch error", e);
  }
  
  if (cachedParticipants.length >= settings.dailyQuota) {
    return { success: false, error: 'Kuota harian telah habis.' };
  }

  const isAlreadyRegistered = cachedParticipants.some(p => p.whatsapp === data.whatsapp);
  if (isAlreadyRegistered) {
    return { success: false, error: 'Nomor WhatsApp ini sudah mengambil antrian hari ini.' };
  }

  const prefixMap: Record<ServiceType, string> = {
    'Pendaftaran Peserta': 'A',
    'Perubahan data': 'B',
    'Informasi & Pengaduan': 'C'
  };

  const prefix = prefixMap[data.serviceType as ServiceType];
  const nextGlobalNumber = cachedParticipants.length + 1;
  const queueNumber = `${prefix}-${nextGlobalNumber.toString().padStart(2, '0')}`;
  
  const newParticipantData = {
    ...data,
    queueNumber,
    timestamp: new Date().toISOString(),
    status: 'Waiting' as const,
    date: today,
  };

  try {
    const docRef = await addDoc(collection(db, 'participants'), newParticipantData);
    const newParticipant = { id: docRef.id, ...newParticipantData };

    // Kirim WhatsApp via API Route (Awaited untuk stabilitas)
    const waResponse = await fetch("/api/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: newParticipant.whatsapp,
        message: `*VIOLA – Virtual Office Layanan Peserta*\n\nNomor Antrian Anda : *${newParticipant.queueNumber}*\nLayanan : ${newParticipant.serviceType}\n\nSilakan menunggu panggilan petugas.\n\nLink Zoom:\n${settings.zoomLink}`,
      }),
    });

    const waResult = await waResponse.json();
    if (!waResult.success) {
      console.error("WhatsApp notification failed to send:", waResult.error || waResult.data);
    }

    return { success: true, participant: newParticipant };
  } catch (e) {
    console.error("Error adding participant:", e);
    return { success: false, error: 'Gagal menyimpan ke database.' };
  }
};

export const updateParticipantStatus = async (id: string, status: Participant['status'], staffName?: string) => {
  const now = new Date().toISOString();
  const docRef = doc(db, 'participants', id);
  
  const updates: any = { status };
  if (status === 'Being Served') {
    updates.serveStartTime = now;
    updates.staffName = staffName || 'Admin VIOLA';
  } else if (status === 'Finished') {
    updates.serveEndTime = now;
  }

  await updateDoc(docRef, updates);
};
