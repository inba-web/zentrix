// Phishing Analyzer Service

function analyzePhishing(rawContent) {
  let spfStatus = 'PASS';
  let dkimStatus = 'PASS';
  let dmarcStatus = 'PASS';
  let senderReputation = 'Neutral';
  const headerAnomalies = [];
  const links = [];
  let sender = 'Unknown';
  let subject = 'Unknown';

  const contentLower = rawContent.toLowerCase();

  // 1. Extract basic fields if headers are present
  const fromMatch = rawContent.match(/^From:\s*(.+)$/m);
  if (fromMatch) sender = fromMatch[1].trim();

  const subMatch = rawContent.match(/^Subject:\s*(.+)$/m);
  if (subMatch) subject = subMatch[1].trim();

  // 2. Scan for SPF, DKIM, DMARC auth results in headers
  if (contentLower.includes('spf=fail') || contentLower.includes('spf=softfail') || contentLower.includes('received-spf: fail')) {
    spfStatus = 'FAIL';
  } else if (!contentLower.includes('spf=')) {
    spfStatus = 'NONE';
    headerAnomalies.push('Missing SPF validation records.');
  }

  if (contentLower.includes('dkim=fail') || contentLower.includes('dkim: fail')) {
    dkimStatus = 'FAIL';
  } else if (!contentLower.includes('dkim=')) {
    dkimStatus = 'NONE';
    headerAnomalies.push('Email body lacks DKIM cryptographic signatures.');
  }

  if (contentLower.includes('dmarc=fail')) {
    dmarcStatus = 'FAIL';
  } else if (!contentLower.includes('dmarc=')) {
    dmarcStatus = 'NONE';
    headerAnomalies.push('Domain security policy (DMARC) record not declared.');
  }

  // 3. Sender domain & display name mismatch (anomaly)
  if (sender !== 'Unknown') {
    const senderEmailMatch = sender.match(/<([^>]+)>/);
    const emailStr = senderEmailMatch ? senderEmailMatch[1] : sender;
    const parts = emailStr.split('@');
    const domain = parts[parts.length - 1]?.trim().toLowerCase();

    // Check display name mismatch
    const displayName = sender.split('<')[0]?.trim().toLowerCase();
    if (displayName && !displayName.includes(domain.split('.')[0])) {
      // e.g. "PayPal Support <hackers@gmail.com>"
      headerAnomalies.push(`Display Name Mismatch: Display says "${displayName}" but emails from domain: "${domain}"`);
      senderReputation = 'Poor';
    }

    // High risk keywords in sender domain
    const suspiciousKeywords = ['secure', 'paypal', 'support', 'verify', 'update', 'login', 'billing', 'invoice', 'account'];
    const isSuspiciousDomain = suspiciousKeywords.some(k => domain.includes(k)) && !['paypal.com', 'microsoft.com', 'google.com'].includes(domain);
    if (isSuspiciousDomain) {
      headerAnomalies.push(`Sender domain "${domain}" contains suspicious trust-grabbing keywords.`);
      senderReputation = 'Dangerous';
    }
  }

  // 4. Extract and check URLs
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  let match;
  while ((match = urlRegex.exec(rawContent)) !== null) {
    const url = match[0];
    links.push(url);
  }

  const suspiciousUrls = [];
  links.forEach(u => {
    const uLower = u.toLowerCase();
    // Check for raw IP address in URL
    const hasIp = /https?:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/i.test(uLower);
    // Check for suspicious domains
    const isSuspiciousLink = ['login', 'verify', 'update', 'secure', 'signin', 'redirect', 'account-update'].some(k => uLower.includes(k));
    
    if (hasIp || isSuspiciousLink) {
      suspiciousUrls.push(u);
    }
  });

  // 5. Keyword analysis
  const phishingKeywords = [
    { word: 'urgent', weight: 15 },
    { word: 'verify your account', weight: 25 },
    { word: 'action required', weight: 20 },
    { word: 'unauthorized access', weight: 20 },
    { word: 'suspended', weight: 15 },
    { word: 'click here', weight: 10 },
    { word: 'password reset', weight: 15 },
    { word: 'immediate attention', weight: 20 }
  ];

  let keywordScore = 0;
  const matchedKeywords = [];
  phishingKeywords.forEach(k => {
    if (contentLower.includes(k.word)) {
      keywordScore += k.weight;
      matchedKeywords.push(k.word);
    }
  });

  // 6. Calculate total threat confidence score
  let score = 0;
  if (spfStatus === 'FAIL') score += 20;
  if (dkimStatus === 'FAIL') score += 15;
  if (dmarcStatus === 'FAIL') score += 15;
  score += headerAnomalies.length * 15;
  score += suspiciousUrls.length * 20;
  score += keywordScore;

  // Cap score at 100
  score = Math.min(100, score);

  let status = 'Legitimate';
  if (score > 65) {
    status = 'Malicious';
  } else if (score > 30) {
    status = 'Suspicious';
  }

  return {
    sender,
    subject,
    spfStatus,
    dkimStatus,
    dmarcStatus,
    senderReputation,
    headerAnomalies,
    extractedUrls: links.slice(0, 10),
    suspiciousUrls,
    matchedKeywords,
    score,
    status
  };
}

module.exports = {
  analyzePhishing
};
