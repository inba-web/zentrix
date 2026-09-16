const axios = require('axios');
const fs = require('fs');
const path = require('path');
const credentialStore = require('../utils/credentialStore');
const connectivityDetector = require('../utils/connectivityDetector');
const db = require('../db');

const RESEND_API_URL = 'https://api.resend.com/emails';

async function getResendApiKey() {
  return await credentialStore.getSecret('resend');
}

async function checkStatus() {
  const apiKey = await getResendApiKey();
  const configured = Boolean(apiKey);
  const isOnline = await connectivityDetector.checkInternetConnectivity();
  const integrationRecord = await db.integrationStatus.findOne({ integration_name: 'resend' });
  const enabled = integrationRecord ? Boolean(integrationRecord.enabled) : true;
  const fromEmail = integrationRecord ? integrationRecord.fromEmail || 'security@zentrix.local' : 'security@zentrix.local';

  return {
    name: 'Resend',
    configured,
    enabled,
    available: configured && enabled && isOnline,
    isOnline,
    fromEmail
  };
}

async function sendReportEmail(recipientEmail, pdfPath, pdfName, reportType = 'Executive Summary') {
  const status = await checkStatus();

  if (!status.configured) {
    return {
      success: false,
      error: 'UNCONFIGURED',
      message: 'Resend API key is not configured. Local report saved successfully.'
    };
  }

  if (!status.isOnline) {
    return {
      success: false,
      error: 'OFFLINE',
      message: 'Internet connection is required to send emails via Resend. Report generated locally.'
    };
  }

  if (!fs.existsSync(pdfPath)) {
    return {
      success: false,
      error: 'FILE_NOT_FOUND',
      message: 'Local report PDF file does not exist.'
    };
  }

  const apiKey = await getResendApiKey();
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  try {
    const response = await axios.post(
      RESEND_API_URL,
      {
        from: status.fromEmail || 'ZENTRIX Security <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `[ZENTRIX SOC] ${reportType} Security Audit Report`,
        html: `<h3>ZENTRIX SOC Workstation Audit Report</h3>
               <p>Find attached the latest automated security report <b>${pdfName}</b>.</p>
               <p>Generated at: ${new Date().toUTCString()}</p>`,
        attachments: [
          {
            filename: pdfName,
            content: pdfBase64
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    // Audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: 'ResendAdapter',
      action: 'SEND_REPORT_EMAIL',
      details: `Dispatched report email to ${recipientEmail} via Resend. Resend ID: ${response.data.id}`,
      ip: '127.0.0.1'
    });

    return {
      success: true,
      resendId: response.data.id,
      message: `Report successfully dispatched to ${recipientEmail} via Resend.`
    };

  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    await db.auditLogs.create({
      timestamp: new Date(),
      user: 'ResendAdapter',
      action: 'SEND_REPORT_EMAIL_FAILED',
      details: `Failed to dispatch report email to ${recipientEmail}. Reason: ${errorMsg}`,
      ip: '127.0.0.1'
    });

    return {
      success: false,
      error: 'API_ERROR',
      message: `Resend Email Delivery failed: ${errorMsg}`
    };
  }
}

module.exports = {
  checkStatus,
  sendReportEmail
};
