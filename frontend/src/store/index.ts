import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- Auth Slice ---
interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
}
const initialAuthState: AuthState = {
  user: null,
  token: localStorage.getItem('soc_token'),
  loading: true,
};
const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem('soc_token', action.payload);
      } else {
        localStorage.removeItem('soc_token');
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('soc_token');
    }
  }
});

// --- Dashboard Slice ---
interface DashboardState {
  liveAlerts: any[];
  websocketLogs: any[];
  dbStatus: string;
  liveTelemetry: any | null;
}
const initialDashboardState: DashboardState = {
  liveAlerts: [],
  websocketLogs: [],
  dbStatus: 'Detecting...',
  liveTelemetry: null,
};
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: initialDashboardState,
  reducers: {
    setLiveTelemetry: (state, action: PayloadAction<any>) => {
      state.liveTelemetry = action.payload;
    },
    addLiveAlert: (state, action: PayloadAction<any>) => {
      state.liveAlerts = [action.payload, ...state.liveAlerts];
    },
    setLiveAlerts: (state, action: PayloadAction<any[]>) => {
      state.liveAlerts = action.payload;
    },
    addWebsocketLog: (state, action: PayloadAction<any>) => {
      state.websocketLogs = [action.payload, ...state.websocketLogs].slice(0, 100);
    },
    setDbStatus: (state, action: PayloadAction<string>) => {
      state.dbStatus = action.payload;
    }
  }
});

// --- Scanner Slice ---
interface ScannerState {
  isScanning: boolean;
  progress: number;
  target: string;
  profile: string;
  outputLogs: string[];
  hosts: any[];
  ports: any[];
}
const initialScannerState: ScannerState = {
  isScanning: false,
  progress: 0,
  target: '192.168.1.1/24',
  profile: 'Quick Scan',
  outputLogs: [],
  hosts: [],
  ports: [],
};
const scannerSlice = createSlice({
  name: 'scanner',
  initialState: initialScannerState,
  reducers: {
    startScan: (state, action: PayloadAction<{ target: string; profile: string }>) => {
      state.isScanning = true;
      state.progress = 0;
      state.target = action.payload.target;
      state.profile = action.payload.profile;
      state.outputLogs = [`[NMAP] Starting Nmap 7.92 ( https://nmap.org ) at ${new Date().toISOString()}`];
      state.hosts = [];
      state.ports = [];
    },
    updateScanProgress: (state, action: PayloadAction<{ progress: number; log?: string }>) => {
      state.progress = action.payload.progress;
      if (action.payload.log) {
        state.outputLogs.push(action.payload.log);
      }
    },
    completeScan: (state, action: PayloadAction<{ hosts: any[]; ports: any[]; logs: string[] }>) => {
      state.isScanning = false;
      state.progress = 100;
      state.hosts = action.payload.hosts;
      state.ports = action.payload.ports;
      state.outputLogs = [...state.outputLogs, ...action.payload.logs, `[NMAP] Nmap done: 1 IP address scanned in ${((Math.random() * 2) + 0.5).toFixed(2)} seconds`];
    },
    setScannerState: (state, action: PayloadAction<Partial<ScannerState>>) => {
      return { ...state, ...action.payload };
    }
  }
});

// --- Packet Analysis Slice ---
interface PacketState {
  isCapturing: boolean;
  packets: any[];
  selectedPacket: any | null;
  filter: string;
  searchQuery: string;
}
const initialPacketState: PacketState = {
  isCapturing: true,
  packets: [],
  selectedPacket: null,
  filter: 'all',
  searchQuery: '',
};
const packetSlice = createSlice({
  name: 'packets',
  initialState: initialPacketState,
  reducers: {
    toggleCapture: (state) => {
      state.isCapturing = !state.isCapturing;
    },
    addPacket: (state, action: PayloadAction<any>) => {
      if (state.isCapturing) {
        state.packets = [action.payload, ...state.packets].slice(0, 500);
      }
    },
    clearPackets: (state) => {
      state.packets = [];
      state.selectedPacket = null;
    },
    setSelectedPacket: (state, action: PayloadAction<any | null>) => {
      state.selectedPacket = action.payload;
    },
    setFilter: (state, action: PayloadAction<string>) => {
      state.filter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }
  }
});

// --- EDR Slice ---
interface EdrState {
  edrUpdates: Record<string, any>;
}
const initialEdrState: EdrState = {
  edrUpdates: {},
};
const edrSlice = createSlice({
  name: 'edr',
  initialState: initialEdrState,
  reducers: {
    updateEdrStats: (state, action: PayloadAction<any>) => {
      state.edrUpdates[action.payload.hostname] = action.payload;
    }
  }
});

// --- Configure Store ---
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    dashboard: dashboardSlice.reducer,
    scanner: scannerSlice.reducer,
    packets: packetSlice.reducer,
    edr: edrSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { setUser, setToken, setLoading, logout } = authSlice.actions;
export const { setLiveTelemetry, addLiveAlert, setLiveAlerts, addWebsocketLog, setDbStatus } = dashboardSlice.actions;
export const { startScan, updateScanProgress, completeScan, setScannerState } = scannerSlice.actions;
export const { toggleCapture, addPacket, clearPackets, setSelectedPacket, setFilter, setSearchQuery } = packetSlice.actions;
export const { updateEdrStats } = edrSlice.actions;
