const axios = require('axios');
const credentialStore = require('../utils/credentialStore');
const connectivityDetector = require('../utils/connectivityDetector');
const db = require('../db');

const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

// Helper to calculate VT URL ID base64
function getVtUrlId(url) {
  return Buffer.from(url).toString('base64').replace(/=/g, '');
}

async function getVirusTotalApiKey() {
  return await credentialStore.getSecret('virustotal');
}

async function checkStatus() {
  const apiKey = await getVirusTotalApiKey();
  const configured = Boolean(apiKey);
  const isOnline = await connectivityDetector.checkInternetConnectivity();
  const integrationRecord = await db.integrationStatus.findOne({ integration_name: 'virustotal' });
  const enabled = integrationRecord ? Boolean(integrationRecord.enabled) : true;

  return {
    name: 'VirusTotal',
    configured,
    enabled,
    available: configured && enabled && isOnline,
    isOnline,
    capabilities: ['URL analysis', 'File analysis', 'Hash reputation lookup']
  };
}

async function lookupHash(hash) {
  const status = await checkStatus();
  if (!status.configured) {
    return { error: 'UNCONFIGURED', message: 'VirusTotal API key is not configured in Settings.' };
  }
  if (!status.enabled) {
    return { error: 'DISABLED', message: 'VirusTotal integration is disabled by administrator.' };
  }
  if (!status.isOnline) {
    return { error: 'OFFLINE', message: 'Internet connection is required for VirusTotal analysis.' };
  }

  // Check local cache first (expires in 24 hours)
  const cached = await db.threatIntelligenceResults.findOne({ indicator: hash });
  if (cached && cached.expiresAt && new Date(cached.expiresAt) > new Date()) {
    return {
      ...cached,
      cached: true
    };
  }

  const apiKey = await getVirusTotalApiKey();
  try {
    const res = await axios.get(`${VT_BASE_URL}/files/${hash}`, {
      headers: { 'x-apikey': apiKey },
      timeout: 10000
    });

    const attr = res.data?.data?.attributes || {};
    const stats = attr.last_analysis_stats || {};

    const result = {
      id: `vt_${Date.now()}`,
      indicator: hash,
      indicatorType: 'hash',
      source: 'VirusTotal',
      resultStatus: stats.malicious > 0 ? 'malicious' : (stats.suspicious > 0 ? 'suspicious' : 'clean'),
      reputation: attr.reputation || 0,
      maliciousCount: stats.malicious || 0,
      suspiciousCount: stats.suspicious || 0,
      harmlessCount: stats.harmless || 0,
      undetectedCount: stats.undetected || 0,
      rawPayload: attr,
      checkedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Store in SQLite cache
    await db.threatIntelligenceResults.create(result);
    return { ...result, cached: false };

  } catch (err) {
    if (err.response) {
      if (err.response.status === 404) {
        return { indicator: hash, resultStatus: 'unknown', message: 'Hash not found in VirusTotal database.' };
      }
      if (err.response.status === 401 || err.response.status === 403) {
        return { error: 'UNAUTHORIZED', message: 'Invalid VirusTotal API Key.' };
      }
      if (err.response.status === 429) {
        return { error: 'RATE_LIMITED', message: 'VirusTotal API rate limit exceeded.' };
      }
    }
    return { error: 'API_ERROR', message: `VirusTotal error: ${err.message}` };
  }
}

async function lookupUrl(urlToAnalyze) {
  const status = await checkStatus();
  if (!status.configured) {
    return { error: 'UNCONFIGURED', message: 'VirusTotal API key is not configured.' };
  }
  if (!status.isOnline) {
    return { error: 'OFFLINE', message: 'Internet connection is required for VirusTotal analysis.' };
  }

  const apiKey = await getVirusTotalApiKey();
  const urlId = getVtUrlId(urlToAnalyze);

  try {
    const res = await axios.get(`${VT_BASE_URL}/urls/${urlId}`, {
      headers: { 'x-apikey': apiKey },
      timeout: 10000
    });

    const attr = res.data?.data?.attributes || {};
    const stats = attr.last_analysis_stats || {};

    const result = {
      id: `vt_url_${Date.now()}`,
      indicator: urlToAnalyze,
      indicatorType: 'url',
      source: 'VirusTotal',
      resultStatus: stats.malicious > 0 ? 'malicious' : 'clean',
      reputation: attr.reputation || 0,
      maliciousCount: stats.malicious || 0,
      suspiciousCount: stats.suspicious || 0,
      harmlessCount: stats.harmless || 0,
      undetectedCount: stats.undetected || 0,
      rawPayload: attr,
      checkedAt: new Date().toISOString()
    };

    await db.threatIntelligenceResults.create(result);
    return result;

  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { indicator: urlToAnalyze, resultStatus: 'unknown', message: 'URL not previously scanned on VirusTotal.' };
    }
    return { error: 'API_ERROR', message: `VirusTotal error: ${err.message}` };
  }
}

module.exports = {
  checkStatus,
  lookupHash,
  lookupUrl
};
