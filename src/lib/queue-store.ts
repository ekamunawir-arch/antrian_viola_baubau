import { Participant, ServiceType, DAILY_QUOTA, SystemSettings, DEFAULT_ZOOM_LINK, DEFAULT_CLERKS } from './queue-types';

const STORAGE_KEY = 'viola_queue_data';
const SETTINGS_KEY = 'viola_settings';

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
  // Dispatch custom event for same-window sync
  window.dispatchEvent(new Event('viola_storage_update'));
};

export const clearQueueData = () => {
  const today = new Date().toISOString().split('T')[0];
  const newData = { participants: [], date: today };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  window.dispatchEvent(new Event('viola_storage_update'));
};

export const getSettings = (): SystemSettings => {
  if (typeof window === 'undefined') return { dailyQuota: DAILY_QUOTA, zoomLink: DEFAULT_ZOOM_LINK, clerks: DEFAULT_CLERKS };
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    return {
      dailyQuota: parsed.dailyQuota ?? DAILY_QUOTA,
      zoomLink: parsed.zoomLink ?? DEFAULT_ZOOM_LINK,
      clerks: parsed.clerks ?? DEFAULT_CLERKS
    };
  }
  return { dailyQuota: DAILY_QUOTA, zoomLink: DEFAULT_ZOOM_LINK, clerks: DEFAULT_CLERKS };
};

export const saveSettings = (settings: SystemSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('viola_storage_update'));
};

// Listener untuk sinkronisasi antar tab/jendela (cross-tab sync)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === SETTINGS_KEY) {
      window.dispatchEvent(new Event('viola_storage_update'));
    }
  });
}

export const addParticipant = (data: Omit<Participant, 'id' | 'queueNumber' | 'timestamp' | 'status'>): { success: boolean; error?: string; participant?: Participant } => {
  const { participants } = getQueueData();
  const { dailyQuota } = getSettings();
  
  if (participants.length >= dailyQuota) {
    return { success: false, error: 'Kuota harian telah habis.' };
  }

  // Cek apakah nomor WA sudah digunakan hari ini
  const isAlreadyRegistered = participants.some(p => p.whatsapp === data.whatsapp);
  if (isAlreadyRegistered) {
    return { success: false, error: 'Nomor WhatsApp ini sudah mengambil antrian hari ini.' };
  }

  // Pilihan prefix berdasarkan jenis layanan
  const prefixMap: Record<ServiceType, string> = {
    'Pendaftaran Peserta': 'A',
    'Perubahan data': 'B',
    'Informasi & Pengaduan': 'C'
  };

  const prefix = prefixMap[data.serviceType as ServiceType];
  
  // Menggunakan nomor urut global agar tidak ada nomor yang sama
  const nextGlobalNumber = participants.length + 1;
  const queueNumber = `${prefix}-${nextGlobalNumber.toString().padStart(2, '0')}`;
  
  const newParticipant: Participant = {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    queueNumber,
    timestamp: new Date().toISOString(),
    status: 'Waiting',
  };

  saveQueueData([...participants, newParticipant]);

  try {
    const { zoomLink } = getSettings();

    const message = `VIOLA – Virtual Office Layanan Peserta

Nomor Antrian Anda : ${newParticipant.queueNumber}
Layanan : ${newParticipant.serviceType}

Silakan menunggu panggilan petugas.

Link Zoom:
${zoomLink}`;

    // Memanggil API Route internal kita
    fetch("/api/send-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: newParticipant.whatsapp,
        message: message,
      }),
    }).then(res => res.json())
      .then(data => console.log("WhatsApp Response:", data))
      .catch(err => console.error("WhatsApp Fetch Error:", err));

  } catch (error) {
    console.error("WhatsApp notification logic error:", error);
  }

  return { success: true, participant: newParticipant };
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
