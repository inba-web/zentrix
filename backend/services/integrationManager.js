const connectivityDetector = require('../utils/connectivityDetector');
const credentialStore = require('../utils/credentialStore');
const vtAdapter = require('./vtAdapter');
const resendAdapter = require('./resendAdapter');
const db = require('../db');

async function getIntegrationOverview() {
  const isOnline = await connectivityDetector.checkInternetConnectivity();
  const vtStatus = await vtAdapter.checkStatus();
  const resendStatus = await resendAdapter.checkStatus();

  return {
    internet: {
      online: isOnline,
      status: isOnline ? 'Connected' : 'Offline'
    },
    integrations: {
      virustotal: vtStatus,
      resend: resendStatus,
      ollama: {
        name: 'Ollama AI (Local)',
        configured: true,
        enabled: true,
        available: true,
        isOnline: true,
        mode: 'Local-first'
      }
    }
  };
}

async function configureIntegration(name, options = {}) {
  const { apiKey, fromEmail, enabled } = options;

  if (apiKey !== undefined) {
    if (apiKey.trim() === '') {
      await credentialStore.deleteSecret(name);
    } else {
      await credentialStore.setSecret(name, apiKey);
    }
  }

  const existing = await db.integrationStatus.findOne({ integration_name: name }) || {};
  const updated = {
    integrationName: name,
    enabled: enabled !== undefined ? Boolean(enabled) : (existing.enabled !== undefined ? existing.enabled : true),
    configured: await credentialStore.hasSecret(name),
    fromEmail: fromEmail || existing.fromEmail || null,
    updatedAt: new Date().toISOString()
  };

  await db.integrationStatus.create(updated);

  await db.auditLogs.create({
    timestamp: new Date(),
    user: 'Administrator',
    action: `CONFIGURE_INTEGRATION_${name.toUpperCase()}`,
    details: `Updated settings for integration ${name}. Enabled: ${updated.enabled}`,
    ip: '127.0.0.1'
  });

  return getIntegrationOverview();
}

module.exports = {
  getIntegrationOverview,
  configureIntegration
};
