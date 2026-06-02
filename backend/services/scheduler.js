const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const reportsService = require('./reportsService');

// Local simulator logs paths
const LOGS_DIR = path.join(__dirname, '..', 'reports', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const emailSimPath = path.join(LOGS_DIR, 'email_simulator.log');
const whatsappSimPath = path.join(LOGS_DIR, 'whatsapp_simulator.log');

let activeCronJob = null;

// Dynamic SMTP / Mail Transport
async function sendEmailReport(recipient, pdfPath, pdfName) {
  const smtpUrl = process.env.SMTP_URL; // e.g. smtps://user:pass@smtp.gmail.com
  if (smtpUrl) {
    try {
      const transporter = nodemailer.createTransport(smtpUrl);
      await transporter.sendMail({
        from: '"ZENTRIX SOC Scanner" <scanner@zentrix.local>',
        to: recipient,
        subject: `[ZENTRIX] Scheduled Security Posture Audit Report`,
        text: `Please find attached the latest ZENTRIX Security Operations Center Audit Report for your workstation node.`,
        attachments: [{ filename: pdfName, path: pdfPath }]
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  } else {
    // Falls back to high-fidelity Simulator Logging (offline local-first)
    const logMsg = `[${new Date().toISOString()}] EMAIL SIMULATOR: Dispatched report "${pdfName}" to: ${recipient}. File attached locally at: ${pdfPath}\n`;
    fs.appendFileSync(emailSimPath, logMsg);
    return { success: true, simulated: true };
  }
}

// Dynamic Twilio/WhatsApp Transport
async function sendWhatsAppReport(number, pdfPath, pdfName, score) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox default

  if (accountSid && authToken) {
    try {
      const client = require('twilio')(accountSid, authToken);
      const downloadLink = `http://localhost:5000/reports/${pdfName}`;
      
      await client.messages.create({
        from: twilioNumber,
        to: `whatsapp:${number}`,
        body: `*ZENTRIX SECURITY AUDIT*\nLatest Executive Summary Compiled.\n*Safety Posture Score:* ${score}%\nDownload secure PDF: ${downloadLink}`
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  } else {
    // Offline local-first simulator logs
    const logMsg = `[${new Date().toISOString()}] WHATSAPP SIMULATOR: Dispatched secure notification for report "${pdfName}" to target: ${number}. Posture safety: ${score}%. Local PDF Path: ${pdfPath}\n`;
    fs.appendFileSync(whatsappSimPath, logMsg);
    return { success: true, simulated: true };
  }
}

// Main Report Runner triggered by Scheduler
async function runScheduledReportGeneration() {
  console.log('[SCHEDULER] Initiating automated report compilation cycle...');
  
  // 1. Fetch registered profile settings
  let recipientEmail = 'admin@zentrix.local';
  let whatsappNumber = '+1234567890';
  let emailEnabled = true;
  let whatsappEnabled = true;

  try {
    const list = await db.users.find({});
    if (list && list.length > 0) {
      const user = list[0];
      recipientEmail = user.email || recipientEmail;
      whatsappNumber = user.whatsapp || whatsappNumber;
      // Default configurations or customized properties inside user settings
      emailEnabled = user.emailReportsEnabled !== false;
      whatsappEnabled = user.whatsAppReportsEnabled !== false;
    }
  } catch (e) {
    // Fallback to defaults
  }

  try {
    // 2. Generate Reports
    const result = await reportsService.compileSecurityReports(recipientEmail, 'Executive Summary');
    const { report, pdfPath, pdfName } = result;

    const emailStatus = emailEnabled ? 'Pending' : 'Disabled';
    const whatsappStatus = whatsappEnabled ? 'Pending' : 'Disabled';

    // 3. Register delivery log in DB
    const delivery = await db.deliveryLogs.create({
      reportId: report._id,
      emailStatus,
      whatsAppStatus,
      deliveryTimestamp: new Date(),
      failureReason: '',
      retryCount: 0
    });

    // 4. Send Email
    if (emailEnabled) {
      const mailRes = await sendEmailReport(recipientEmail, pdfPath, pdfName);
      if (mailRes.success) {
        await db.deliveryLogs.findByIdAndUpdate(delivery._id, { emailStatus: 'Delivered' });
      } else {
        await db.deliveryLogs.findByIdAndUpdate(delivery._id, { 
          emailStatus: 'Failed', 
          failureReason: `Email Error: ${mailRes.error}`
        });
      }
    }

    // 5. Send WhatsApp
    if (whatsappEnabled) {
      const waRes = await sendWhatsAppReport(whatsappNumber, pdfPath, pdfName, report.securityScore);
      if (waRes.success) {
        await db.deliveryLogs.findByIdAndUpdate(delivery._id, { whatsAppStatus: 'Delivered' });
      } else {
        await db.deliveryLogs.findByIdAndUpdate(delivery._id, { 
          whatsAppStatus: 'Failed', 
          failureReason: `WhatsApp Error: ${waRes.error}` 
        });
      }
    }

    // Update main report status to dispatched
    await db.reports.findByIdAndUpdate(report._id, { deliveryStatus: 'Dispatched' });
    console.log('[SCHEDULER] Automated reports successfully generated and queued for delivery.');

  } catch (err) {
    console.error('[SCHEDULER] Scheduled report compilation failed:', err.message);
  }
}

// Active Delivery Retry Poller Loop (Runs every minute to process failures after 5, 15, and 30 minutes)
async function processRetries() {
  try {
    const failedLogs = await db.deliveryLogs.find({
      $or: [{ emailStatus: 'Failed' }, { whatsAppStatus: 'Failed' }],
      retryCount: { $lt: 3 }
    });

    for (let log of failedLogs) {
      const diffMs = new Date() - new Date(log.deliveryTimestamp);
      const diffMins = Math.floor(diffMs / (1000 * 60));

      // Retry intervals: 5, 15, 30 minutes
      const expectedIntervals = [5, 15, 30];
      const nextInterval = expectedIntervals[log.retryCount];

      if (diffMins >= nextInterval) {
        console.log(`[RETRY] Triggering automated delivery retry #${log.retryCount + 1} for delivery log ${log._id} (age: ${diffMins}m, expected: ${nextInterval}m)`);
        
        // Fetch report meta
        const report = await db.reports.findOne({ _id: log.reportId });
        if (!report) continue;

        const pdfPath = path.join(__dirname, '..', 'reports', report.fileName);
        const nextRetryCount = log.retryCount + 1;
        const updates = { retryCount: nextRetryCount };

        // Retry Email
        if (log.emailStatus === 'Failed') {
          const mailRes = await sendEmailReport(report.recipient, pdfPath, report.fileName);
          if (mailRes.success) {
            updates.emailStatus = 'Delivered';
          } else {
            updates.failureReason = `Retry Fail: ${mailRes.error}`;
          }
        }

        // Retry WhatsApp
        if (log.whatsAppStatus === 'Failed') {
          // Retrieve whatsapp number from user
          let whatsappNumber = '+1234567890';
          const uList = await db.users.find({});
          if (uList && uList.length > 0) whatsappNumber = uList[0].whatsapp || whatsappNumber;

          const waRes = await sendWhatsAppReport(whatsappNumber, pdfPath, report.fileName, report.securityScore);
          if (waRes.success) {
            updates.whatsAppStatus = 'Delivered';
          } else {
            updates.failureReason = `Retry Fail: ${waRes.error}`;
          }
        }

        await db.deliveryLogs.findByIdAndUpdate(log._id, updates);
      }
    }
  } catch (err) {
    // Ignore error
  }
}

// Immediate WhatsApp alert trigger for critical events
async function triggerImmediateWhatsAppAlert(alertTitle, alertDetails) {
  let whatsappNumber = '+1234567890';
  let alertsEnabled = true;

  try {
    const list = await db.users.find({});
    if (list && list.length > 0) {
      whatsappNumber = list[0].whatsapp || whatsappNumber;
      alertsEnabled = list[0].whatsAppReportsEnabled !== false;
    }
  } catch (e) {
    // Ignore
  }

  if (alertsEnabled) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (accountSid && authToken) {
      try {
        const client = require('twilio')(accountSid, authToken);
        await client.messages.create({
          from: twilioNumber,
          to: `whatsapp:${whatsappNumber}`,
          body: `*ZENTRIX IMMEDIATE SECURITY ALERT*\n*Event:* ${alertTitle}\n*Details:* ${alertDetails}`
        });
      } catch (e) {
        console.error('[MAIL/ALERT] Failed to dispatch Twilio WhatsApp alert:', e.message);
      }
    } else {
      const logMsg = `[${new Date().toISOString()}] WHATSAPP IMMEDIATE ALERT SIMULATOR: Target: ${whatsappNumber}. Event: ${alertTitle}. Details: ${alertDetails}\n`;
      fs.appendFileSync(whatsappSimPath, logMsg);
    }
  }
}

// Main Scheduler configuration
function init(io) {
  // Read user-defined scheduler interval on load
  // Cron syntax default is: every 12 hours (0 */12 * * *)
  // To allow dynamic config, we will poll profile frequency every minute and reschedule if it changes
  let currentFreqHours = 12;

  const scheduleJob = (hours) => {
    if (activeCronJob) {
      activeCronJob.stop();
    }
    const cronStr = `0 */${hours} * * *`;
    activeCronJob = cron.schedule(cronStr, () => {
      runScheduledReportGeneration();
    });
    console.log(`[SCHEDULER] Successfully scheduled automated executive reports every ${hours} hours.`);
  };

  scheduleJob(currentFreqHours);

  // Poll user settings profile to handle dynamic frequency changes
  setInterval(async () => {
    try {
      const uList = await db.users.find({});
      if (uList && uList.length > 0) {
        const user = uList[0];
        const userFreq = user.reportFrequency || 12;
        if (userFreq !== currentFreqHours) {
          console.log(`[SCHEDULER] Setting frequency modified by administrator from ${currentFreqHours}h to ${userFreq}h.`);
          currentFreqHours = userFreq;
          scheduleJob(currentFreqHours);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, 30000);

  // Spin up delivery retry poller loop every 1 minute
  setInterval(processRetries, 60000);
}

module.exports = {
  init,
  runScheduledReportGeneration,
  triggerImmediateWhatsAppAlert
};
