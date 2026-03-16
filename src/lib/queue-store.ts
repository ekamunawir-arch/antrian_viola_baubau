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
  getDocs,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { 
  Participant, 
  ServiceType, 
  DAILY_QUOTA, 
  SystemSettings, 
  DEFAULT_ZOOM_LINK, 
  DEFAULT_CLERKS,
  DEFAULT_OPERATING_DAYS,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  DEFAULT_SERVICE_START_TIME
} from './queue-types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let cachedParticipants: Participant[] = [];
let cachedSettings: SystemSettings = { 
  dailyQuota: DAILY_QUOTA, 
  zoomLink: DEFAULT_ZOOM_LINK, 
  clerks: DEFAULT_CLERKS,
  videoUrl: '',
  operatingDays: DEFAULT_OPERATING_DAYS,
  startTime: DEFAULT_START_TIME,
  endTime: DEFAULT_END_TIME,
  serviceStartTime: DEFAULT_SERVICE_START_TIME,
  holidays: []
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

if (typeof window !== 'undefined') {
  const today = getTodayDate();
  
  const q = query(collection(db, 'participants'), where('date', '==', today));
  onSnapshot(q, (snapshot) => {
    cachedParticipants = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Participant)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    window.dispatchEvent(new Event('viola_storage_update'));
  });

  onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
    if (snapshot.exists()) {
      cachedSettings = {
        ...cachedSettings,
        ...snapshot.data()
      } as SystemSettings;
    } else {
      setDoc(doc(db, 'settings', 'config'), { 
        dailyQuota: DAILY_QUOTA, 
        zoomLink: DEFAULT_ZOOM_LINK, 
        clerks: DEFAULT_CLERKS,
        videoUrl: '',
        lastWhatsAppSentAt: Date.now(),
        operatingDays: DEFAULT_OPERATING_DAYS,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        serviceStartTime: DEFAULT_SERVICE_START_TIME,
        holidays: []
      });
    }
    window.dispatchEvent(new Event('viola_storage_update'));
  });
}

export const refreshQueueData = async () => {
  try {
    const today = getTodayDate();
    const q = query(collection(db, 'participants'), where('date', '==', today));
    const snapshot = await getDocs(q);
    cachedParticipants = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Participant)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    window.dispatchEvent(new Event('viola_storage_update'));
  } catch (error) {
    console.error("Gagal sinkronisasi data antrian:", error);
  }
};

export const getQueueData = (): { participants: Participant[]; date: string } => {
  return { participants: cachedParticipants, date: getTodayDate() };
};

export const getSettings = (): SystemSettings => {
  return cachedSettings;
};

export const saveSettings = async (settings: SystemSettings) => {
  const docRef = doc(db, 'settings', 'config');
  await setDoc(docRef, settings, { merge: true });
};

export const addParticipant = async (data: Omit<Participant, 'id' | 'queueNumber' | 'timestamp' | 'status'>): Promise<{ success: boolean; error?: string; participant?: Participant }> => {
  const today = getTodayDate();
  
  let settings = cachedSettings;
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
    if (settingsDoc.exists()) {
      settings = settingsDoc.data() as SystemSettings;
    }
  } catch (e) {
    console.warn("Gagal mengambil settings terbaru.", e);
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

    // Async WhatsApp background process with logging
    const scheduleWhatsApp = async () => {
      console.log(`[WA] Memulai proses pengiriman untuk ${newParticipant.queueNumber}...`);
      const settingsRef = doc(db, 'settings', 'config');
      
      try {
        const targetTime = await runTransaction(db, async (transaction) => {
          const configDoc = await transaction.get(settingsRef);
          const now = Date.now();
          let lastSentAt = now;

          if (configDoc.exists() && configDoc.data().lastWhatsAppSentAt) {
            lastSentAt = configDoc.data().lastWhatsAppSentAt;
          }

          const scheduledFor = Math.max(now + 5000, lastSentAt + 15000); // 15s gap
          transaction.update(settingsRef, { lastWhatsAppSentAt: scheduledFor });
          return scheduledFor;
        });

        const waitMs = targetTime - Date.now();
        console.log(`[WA] Pesan dijadwalkan dalam ${Math.round(waitMs / 1000)} detik untuk ${newParticipant.whatsapp}...`);
        
        await delay(waitMs);

        const message = `*VIOLA – Virtual Office Layanan Peserta*\n\nNomor Antrian Anda : *${newParticipant.queueNumber}*\nLayanan : ${newParticipant.serviceType}\n\nSilakan menunggu panggilan petugas di area layanan atau melalui dashboard.\n\nLink Zoom Layanan:\n${settings.zoomLink}`;

        const waResponse = await fetch("/api/send-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: newParticipant.whatsapp,
            message: message,
          }),
        });

        const waResult = await waResponse.json();
        if (waResult.success) {
          const pRef = doc(db, 'participants', newParticipant.id);
          await updateDoc(pRef, { whatsappSentAt: new Date().toISOString() });
          console.log(`[WA] BERHASIL! Notifikasi WhatsApp terkirim ke ${newParticipant.whatsapp}`);
        } else {
          console.error(`[WA] GAGAL: ${waResult.error}`);
        }
      } catch (err: any) {
        console.error("[WA] ERROR PADA SISTEM NOTIFIKASI:", err.message);
      }
    };

    scheduleWhatsApp();

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
  if (status === 'Being Served' || status === 'Called' || status === 'called') {
    updates.serveStartTime = now;
    updates.calledAt = now; 
    updates.staffName = staffName || 'Admin VIOLA';
  } else if (status === 'Finished') {
    updates.serveEndTime = now;
    updates.finishedAt = now; 
  }

  await updateDoc(docRef, updates);
};
