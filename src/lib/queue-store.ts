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
  DEFAULT_CLERKS 
} from './queue-types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// State lokal untuk sinkronisasi cepat di UI
let cachedParticipants: Participant[] = [];
let cachedSettings: SystemSettings = { 
  dailyQuota: DAILY_QUOTA, 
  zoomLink: DEFAULT_ZOOM_LINK, 
  clerks: DEFAULT_CLERKS 
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

// Inisialisasi Listeners Real-time dari Firestore
if (typeof window !== 'undefined') {
  const today = getTodayDate();
  
  // Listen data peserta hari ini
  const q = query(collection(db, 'participants'), where('date', '==', today));
  onSnapshot(q, (snapshot) => {
    cachedParticipants = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Participant)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    window.dispatchEvent(new Event('viola_storage_update'));
  });

  // Listen pengaturan sistem (kuota, zoom, loket)
  onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
    if (snapshot.exists()) {
      cachedSettings = snapshot.data() as SystemSettings;
    } else {
      // Inisialisasi default jika dokumen belum ada di Firestore
      setDoc(doc(db, 'settings', 'config'), { 
        dailyQuota: DAILY_QUOTA, 
        zoomLink: DEFAULT_ZOOM_LINK, 
        clerks: DEFAULT_CLERKS,
        lastWhatsAppSentAt: Date.now()
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
  const docRef = doc(db, 'settings', 'config');
  await setDoc(docRef, settings, { merge: true });
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
  
  // Ambil settings terbaru
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
    // 1. Simpan peserta ke Firestore (Instan)
    const docRef = await addDoc(collection(db, 'participants'), newParticipantData);
    const newParticipant = { id: docRef.id, ...newParticipantData };

    // 2. Jadwalkan waktu pengiriman WhatsApp yang unik (Distributed Queue)
    const scheduleWhatsApp = async () => {
      const settingsRef = doc(db, 'settings', 'config');
      
      try {
        const targetTime = await runTransaction(db, async (transaction) => {
          const configDoc = await transaction.get(settingsRef);
          const now = Date.now();
          let lastSentAt = now;

          if (configDoc.exists() && configDoc.data().lastWhatsAppSentAt) {
            lastSentAt = configDoc.data().lastWhatsAppSentAt;
          }

          // Aturan: Jeda minimal 45 detik antar pesan dari SIAPA PUN di sistem
          // Jika sekarang sudah lewat 45 detik dari pengiriman terakhir, mulai dalam 10 detik
          // Jika belum, tambahkan 45 detik dari jadwal terakhir
          const scheduledFor = Math.max(now + 10000, lastSentAt + 45000);
          
          transaction.update(settingsRef, { lastWhatsAppSentAt: scheduledFor });
          return scheduledFor;
        });

        const waitMs = targetTime - Date.now();
        console.log(`WhatsApp ${newParticipant.queueNumber} dijadwalkan dalam ${waitMs / 1000} detik...`);
        
        await delay(waitMs);

        const message = `*VIOLA – Virtual Office Layanan Peserta*\n\nNomor Antrian Anda : *${newParticipant.queueNumber}*\nLayanan : ${newParticipant.serviceType}\n\nSilakan menunggu panggilan petugas.\n\nLink Zoom:\n${settings.zoomLink}`;

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
          console.log(`WhatsApp terkirim untuk ${newParticipant.queueNumber} sesuai jadwal.`);
        } else {
          console.error(`Gagal mengirim WhatsApp: ${waResult.error}`);
        }
      } catch (err) {
        console.error("Kesalahan pada alur penjadwalan WhatsApp:", err);
      }
    };

    // Jalankan penjadwalan di latar belakang
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
  if (status === 'Being Served') {
    updates.serveStartTime = now;
    updates.staffName = staffName || 'Admin VIOLA';
  } else if (status === 'Finished') {
    updates.serveEndTime = now;
  }

  await updateDoc(docRef, updates);
};