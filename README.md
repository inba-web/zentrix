# 🛡️ ZENTRIX — OFFLINE-FIRST DESKTOP SECURITY PLATFORM

> **Local-First, Cross-Platform Desktop Security Operations Center (SOC) for Linux, Windows, and macOS.**

---

## 🚀 Vision & Core Principles

ZENTRIX is a lightweight, cross-platform, local-first desktop security application engineered to continuously monitor the local endpoint, collect security telemetry, detect suspicious behavior, manage incidents, perform threat hunting, and provide automated containment without relying on cloud infrastructure, SaaS dependencies, or remote database servers.

### 🛡️ Non-Negotiable Operating Rule
**Internet availability NEVER determines whether ZENTRIX operates.**

All core features operate 100% offline:
- Executive Dashboard & Real-Time System Metrics
- Endpoint Detection & Response (EDR)
- Security Information & Event Management (SIEM)
- Intrusion Detection System (IDS)
- File Integrity Monitoring (FIM)
- Local Network Interface & Port Monitoring
- Threat Hunting & Rules Engine
- Incident Response & Containment
- Local Threat Intelligence Database & Hash Lookups
- Local PDF/CSV/JSON Security Reports
- Local Embedded SQLite Database
- Local AI Security Analyst (when Ollama is installed)

---

## 🔌 Optional Online Integrations

Online integrations are **strictly optional** and must be explicitly enabled by the user when Internet connectivity is available:

1. **VirusTotal**: Optional URL analysis, file submission (with explicit user consent), and hash reputation lookup with local SQLite caching.
2. **Resend**: Optional external email report delivery for transmitting locally generated PDF security reports to registered email addresses.

---

## ✨ Key Capabilities

### 📊 Local EDR & System Monitoring
- Process tree hierarchy and parent-child relationship tracking
- File integrity monitoring (inotify / FSEvents / ReadDirectoryChangesW)
- Local network connection & listening port monitoring
- Process-to-network-connection mapping

### ⚡ Local Threat Intelligence & Detection
- Local IOC database, blocklists, and detection rules (YARA & Sigma)
- MITRE ATT&CK technique mapping and automated risk scoring
- Local hash cache for immediate offline lookup before optional VirusTotal queries

### 📄 Local Security Reporting & Notifications
- Offline report generator compiling PDF, CSV, and JSON formats
- In-App Alerts, Audio Alarms, and Native Desktop OS Notifications
- Optional Resend email dispatch when online

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                     ZENTRIX DESKTOP                        │
│             React + TypeScript + Desktop Shell             │
└───────────────────────────┬────────────────────────────────┘
                            │ (Secure IPC)
┌───────────────────────────▼────────────────────────────────┐
│                 ZENTRIX SECURITY CORE                      │
│  EDR │ SIEM │ IDS │ FIM │ Threat Hunting │ Local Reports   │
└───────────────────────────┬────────────────────────────────┘
                            │ (OS Abstraction)
             ┌──────────────┼──────────────┐
             │              │              │
           Linux         Windows         macOS
             │              │              │
             └──────────────┼──────────────┘
                            │
                      SQLite Engine
                            │
               Optional Online Integrations
               ┌────────────┴────────────┐
               │                         │
           VirusTotal                  Resend
```

---

## 📁 Data Storage Path

All database records, logs, audit trails, and configuration vault data are stored locally in the native OS application directory:

- **Linux**: `~/.local/share/zentrix/database/zentrix.db`
- **Windows**: `%LOCALAPPDATA%\Zentrix\database\zentrix.db`
- **macOS**: `~/Library/Application Support/Zentrix/database/zentrix.db`

---

## 🛠️ Technology Stack

- **Desktop Shell**: Electron with `contextIsolation: true` & safe IPC bridge (`preload.js`).
- **Frontend**: React 18, TypeScript, Redux Toolkit, TailwindCSS.
- **Backend Core**: Node.js Express server with SQLite embedded engine.
- **Database**: SQLite with Write-Ahead Logging (WAL mode).
- **Credentials**: OS-backed secure credential vault for optional API keys.

---

## 🔐 Privacy & Security Model

- **Zero Cloud Dependency**: No telemetry, logs, or file contents leave your device automatically.
- **User Consent**: External VirusTotal file uploads require explicit UI confirmation.
- **Secure Credentials**: API keys are encrypted in OS-backed credential storage and never stored in plaintext or Git repositories.

---

# ⚡ Observe. Detect. Analyze. Defend.
# 🔥 ZENTRIX — Your Local Cyber Defense Command Center.
