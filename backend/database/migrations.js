const sqliteEngine = require('./sqliteEngine');

async function runMigrations() {
  console.log('[MIGRATION] Initializing ZENTRIX embedded SQLite database schema...');

  const schemaSQL = `
    -- 1. Monitored Hosts / Endpoints
    CREATE TABLE IF NOT EXISTS hosts (
      id TEXT PRIMARY KEY,
      hostname TEXT UNIQUE NOT NULL,
      ip TEXT,
      os TEXT,
      status TEXT DEFAULT 'Online',
      cpu_usage INTEGER,
      ram_usage INTEGER,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      processes TEXT,
      network_connections TEXT
    );

    -- 2. SIEM Log Events
    CREATE TABLE IF NOT EXISTS log_events (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT,
      severity TEXT,
      message TEXT,
      host TEXT,
      user TEXT,
      src_ip TEXT,
      dest_ip TEXT,
      mitre_tactic TEXT,
      mitre_technique TEXT,
      payload TEXT
    );

    -- 3. Security Alerts
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      severity TEXT DEFAULT 'MEDIUM',
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      host TEXT,
      status TEXT DEFAULT 'NEW',
      assigned_to TEXT,
      evidence TEXT
    );

    -- 4. Incident Response Tickets
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      severity TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'NEW',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      impact TEXT,
      root_cause TEXT,
      recommendations TEXT,
      timeline TEXT,
      evidence TEXT
    );

    -- 5. Threat Indicators (Local IOCs)
    CREATE TABLE IF NOT EXISTS threat_indicators (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT UNIQUE NOT NULL,
      threat_type TEXT,
      reputation INTEGER DEFAULT 0,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    -- 6. Threat Intelligence Results (VirusTotal Cache)
    CREATE TABLE IF NOT EXISTS threat_intelligence_results (
      id TEXT PRIMARY KEY,
      indicator TEXT UNIQUE NOT NULL,
      indicator_type TEXT NOT NULL,
      source TEXT DEFAULT 'VirusTotal',
      result_status TEXT,
      reputation INTEGER DEFAULT 0,
      malicious_count INTEGER DEFAULT 0,
      suspicious_count INTEGER DEFAULT 0,
      harmless_count INTEGER DEFAULT 0,
      undetected_count INTEGER DEFAULT 0,
      raw_payload TEXT,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    -- 7. SOAR Playbooks
    CREATE TABLE IF NOT EXISTS playbooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT,
      status TEXT DEFAULT 'Active',
      steps TEXT,
      executions TEXT
    );

    -- 8. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT
    );

    -- 9. Generated Reports
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      title TEXT NOT NULL,
      delivery_status TEXT DEFAULT 'Generated',
      recipient TEXT,
      alerts_count INTEGER,
      endpoint_count INTEGER,
      security_score INTEGER,
      file_name TEXT NOT NULL
    );

    -- 10. Resend Email Delivery Logs
    CREATE TABLE IF NOT EXISTS delivery_logs (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      email_status TEXT DEFAULT 'Pending',
      delivery_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      failure_reason TEXT,
      retry_count INTEGER DEFAULT 0
    );

    -- 11. Application Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'Analyst',
      avatar TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. Email Recipients (Resend Target Management)
    CREATE TABLE IF NOT EXISTS email_recipients (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      enabled INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Integration Settings & Status
    CREATE TABLE IF NOT EXISTS integration_status (
      integration_name TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      configured INTEGER DEFAULT 0,
      from_email TEXT,
      last_success DATETIME,
      last_error TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_log_events_timestamp ON log_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_threat_intel_indicator ON threat_intelligence_results(indicator);
  `;

  try {
    await sqliteEngine.exec(schemaSQL);
    console.log('[MIGRATION] SQLite database migrations completed successfully.');
  } catch (err) {
    console.error('[MIGRATION] Failed to execute database migrations:', err.message);
    throw err;
  }
}

module.exports = {
  runMigrations
};
