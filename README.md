# 🛡️ ZENTRIX

### Local-First Security Operations Center (SOC) Platform

> Enterprise-grade Cybersecurity Command Center built for Security Analysts, SOC Teams, Researchers, and Security Enthusiasts.

---

## 🚀 Vision

Traditional SOC platforms are often cloud-dependent, expensive, and difficult to deploy in isolated environments.

**ZENTRIX** delivers a powerful Local-First Security Operations Center that provides real-time telemetry, threat monitoring, malware analysis, phishing detection, honeypot monitoring, automated reporting, and alerting from a single unified platform.
---

## ✨ Key Features

### 📊 Executive Security Dashboard

- Real-time CPU Monitoring
- Memory Utilization Tracking
- Disk Health Monitoring
- Network Throughput Analytics
- Process Visibility
- System Uptime Metrics
- Live WebSocket Telemetry

---

### 🔍 Security Information & Event Management (SIEM)

- Live System Log Ingestion
- Authentication Log Monitoring
- Security Event Correlation
- Event Timeline Visualization
- Alert Generation Engine
- Real-Time Log Streaming

#### Supported Sources

- Linux Syslog
- Authentication Logs
- Custom Security Events
- Simulated Events (Fallback Mode)

---

### 🖥️ Endpoint Detection & Response (EDR)

Monitor endpoint activities in real-time.

#### Capabilities

- Running Process Monitoring
- Suspicious Process Detection
- Network Connection Tracking
- File Activity Monitoring
- Threat Indicator Detection

#### Threat Indicators

- Netcat
- Mimikatz
- XMRig
- Unauthorized Processes

---

### 🌐 Intrusion Detection System (IDS)

Gain visibility into network activity.

#### Features

- Protocol Statistics
- Bandwidth Analytics
- Source/Destination Tracking
- Packet Monitoring
- Suricata Integration Support

---

### 🍯 Honeypot Monitoring

Capture and analyze unauthorized activities.

#### Features

- Port Scan Detection
- Unauthorized Connection Logging
- Attack Visualization
- Lightweight Built-in Honeypot
- Cowrie Integration Support
- OpenCanary Integration Support

---

### 🦠 Malware Analysis Engine

Upload and analyze suspicious files.

#### Analysis Capabilities

- MD5 Hash Generation
- SHA1 Hash Generation
- SHA256 Hash Generation
- Entropy Analysis
- Metadata Extraction
- String Extraction
- VirusTotal Lookups
- YARA Rule Matching
- Sigma Rule Matching

#### File Limits

```text
Maximum Upload Size: 500 MB
```

---

### 🎣 Phishing Detection Engine

Analyze suspicious emails and headers.

#### Features

- EML Parsing
- Email Header Analysis
- SPF Validation
- DKIM Validation
- DMARC Validation
- URL Reputation Analysis
- Credential Harvesting Detection
- Confidence Scoring

---

### 📄 Automated Security Reporting

Generate professional reports automatically.

#### Supported Formats

- PDF
- CSV
- JSON

#### Report Types

- Executive Reports
- Security Reports
- Audit Reports

---

### 📱 Alert Delivery System

Receive alerts directly through:

- WhatsApp
- Email
- Scheduled Reports
- Incident Notifications

#### Additional Features

- Delivery Logging
- Retry Mechanism
- Alert History
- Delivery Tracking

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────┐
│                ZENTRIX                  │
├─────────────────────────────────────────┤
│ React + TypeScript Frontend             │
├─────────────────────────────────────────┤
│ Express.js API Layer                    │
├─────────────────────────────────────────┤
│ WebSocket Event Streaming               │
├─────────────────────────────────────────┤
│ SIEM │ EDR │ IDS │ Honeypot │ Reports   │
├─────────────────────────────────────────┤
│ MongoDB / JSON Fallback Storage         │
├─────────────────────────────────────────┤
│ Local Operating System Telemetry        │
└─────────────────────────────────────────┘
```

---

## 🧠 Local-First Architecture

### Primary Database

```bash
mongodb://localhost:27017/zentrix
```

### Automatic Fallback Database

```text
backend/data/
```

If MongoDB is unavailable, ZENTRIX automatically switches to JSON-based storage.

---

## 👤 Profile-Based Authentication

Unlike traditional SOC platforms, ZENTRIX uses a streamlined single-user registration model.

### Registration Fields

- Full Name
- Email Address
- WhatsApp Number
- Profile Photo

### Benefits

✅ No Password Required

✅ No OAuth Dependency

✅ Instant Future Access

✅ Simplified User Experience

---

## 📁 Storage Structure

```text
storage/
│
├── uploads/
├── reports/
├── malware/
├── phishing/
├── logs/
└── backups/
```

---

## 🛠️ Technology Stack

### Frontend

- React
- TypeScript
- Redux Toolkit
- React Router
- Socket.IO Client

### Backend

- Node.js
- Express.js
- Socket.IO
- System Information

### Database

- MongoDB
- JSON File Storage

### Security Technologies

- YARA
- Sigma Rules
- VirusTotal API
- SPF Validation
- DKIM Validation
- DMARC Validation

### Reporting

- PDFKit
- Node Cron

### Notifications

- Twilio WhatsApp API
- WhatsApp Business Cloud API
- SMTP Email

---

## ⚡ Real-Time Telemetry

Telemetry updates every:

```text
2 Seconds
```

### Monitored Metrics

- CPU Usage
- RAM Usage
- Disk Utilization
- Network Throughput
- Active Connections
- Process Count
- System Uptime

---

## 🔐 Security Principles

- Local-First Architecture
- Privacy-Focused Design
- Offline Capability
- Least Privilege Approach
- Secure Report Generation
- Comprehensive Audit Logging

---

## 📈 Development Roadmap

### Phase 1 — Foundation

- [x] Architecture Planning
- [x] ZENTRIX Rebranding
- [x] Authentication Redesign

### Phase 2 — Core Monitoring

- [ ] Real-Time Telemetry
- [ ] SIEM Integration
- [ ] EDR Monitoring
- [ ] IDS Monitoring

### Phase 3 — Threat Analysis

- [ ] Malware Analysis Engine
- [ ] Phishing Detection Engine
- [ ] Honeypot Monitoring

### Phase 4 — Automation

- [ ] Automated Reporting
- [ ] WhatsApp Integration
- [ ] Email Alerting

### Phase 5 — Production Release

- [ ] Stable Release
- [ ] Documentation
- [ ] Installer Packaging

---

## 🎯 Target Audience

- SOC Analysts
- Security Engineers
- Blue Team Operators
- Incident Responders
- Security Researchers
- Cybersecurity Students
- Enterprise Security Teams

---

## 📸 Screenshots

```text
Coming Soon...
```

---

## 🤝 Contributing

Contributions, feature suggestions, and security improvements are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 📜 License

```text
MIT License
```

---

## 🛡️ Built With Security In Mind

ZENTRIX is designed to bring enterprise-grade visibility, monitoring, detection, and response capabilities directly to local environments while maintaining simplicity, performance, and operational control.

---

# ⚡ Observe. Detect. Analyze. Defend.

# 🔥 ZENTRIX — Your Local Cyber Defense Command Center.
