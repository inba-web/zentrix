const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const reportsService = require('./reportsService');

const REPORTS_DIR = process.env.ZENTRIX_USER_DATA 
  ? path.join(process.env.ZENTRIX_USER_DATA, 'reports') 
  : path.join(__dirname, '..', 'reports');

const LOGS_DIR = path.join(REPORTS_DIR, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const emailSimPath = path.join(LOGS_DIR, 'email_simulator.log');

let activeCronJob = null;

// Dynamic SMTP / Mail Transport
async function sendEmailReport(recipient, pdfPath, pdfName) {
  const smtpUrl = process.env.SMTP_URL;
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
    const logMsg = `[${new Date().toISOString()}] EMAIL SIMULATOR: Dispatched report "${pdfName}" to: ${recipient}. File attached locally at: ${pdfPath}\n`;
    fs.appendFileSync(emailSimPath, logMsg);
    return { success: true, simulated: true };
  }
}

// Main Report Runner triggered by Scheduler
async function runScheduledReportGeneration() {
  console.log('[SCHEDULER] Initiating automated report compilation cycle...');
  
  let recipientEmail = 'admin@zentrix.local';
  let emailEnabled = true;

  try {
    const list = await db.users.find({});
    if (list && list.length > 0) {
      const user = list[0];
      recipientEmail = user.email || recipientEmail;
      emailEnabled = user.emailReportsEnabled !== false;
    }
  } catch (e) {
    // Fallback to defaults
  }

  try {
    const result = await reportsService.compileSecurityReports(recipientEmail, 'Executive Summary');
    const { report, pdfPath, pdfName } = result;

    const emailStatus = emailEnabled ? 'Pending' : 'Disabled';

    const delivery = await db.deliveryLogs.create({
      reportId: report._id,
      emailStatus,
      deliveryTimestamp: new Date(),
      failureReason: '',
      retryCount: 0
    });

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

    await db.reports.findByIdAndUpdate(report._id, { deliveryStatus: 'Generated Locally' });
    console.log('[SCHEDULER] Automated reports successfully generated.');

  } catch (err) {
    console.error('[SCHEDULER] Scheduled report compilation failed:', err.message);
  }
}

// Active Delivery Retry Poller Loop
async function processRetries() {
  try {
    const failedLogs = await db.deliveryLogs.find({
      emailStatus: 'Failed',
      retryCount: { $lt: 3 }
    });

    for (let log of failedLogs) {
      const diffMs = new Date() - new Date(log.deliveryTimestamp);
      const diffMins = Math.floor(diffMs / (1000 * 60));

      const expectedIntervals = [5, 15, 30];
      const nextInterval = expectedIntervals[log.retryCount];

      if (diffMins >= nextInterval) {
        console.log(`[RETRY] Triggering automated delivery retry #${log.retryCount + 1} for delivery log ${log._id}`);
        
        const report = await db.reports.findOne({ _id: log.reportId });
        if (!report) continue;

        const pdfPath = path.join(REPORTS_DIR, report.fileName);
        const nextRetryCount = log.retryCount + 1;
        const updates = { retryCount: nextRetryCount };

        if (log.emailStatus === 'Failed') {
          const mailRes = await sendEmailReport(report.recipient, pdfPath, report.fileName);
          if (mailRes.success) {
            updates.emailStatus = 'Delivered';
          } else {
            updates.failureReason = `Retry Fail: ${mailRes.error}`;
          }
        }

        await db.deliveryLogs.findByIdAndUpdate(log._id, updates);
      }
    }
  } catch (err) {
    // Ignore error
  }
}

function init(io) {
  // Prune logs job: daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const prunedLogs = await db.logs.deleteMany({ timestamp: { $lt: cutoff.toISOString() } });
      const prunedAudits = await db.auditLogs.deleteMany({ timestamp: { $lt: cutoff.toISOString() } });
      console.log(`[Scheduler] Auto-pruned ${prunedLogs.deletedCount || 0} logs and ${prunedAudits.deletedCount || 0} audit logs older than 3 days.`);
    } catch (err) {
      console.error('[Scheduler] Auto-pruning error:', err.message);
    }
  });

  let currentFreq = 12;

  const scheduleJob = (freq) => {
    if (activeCronJob) {
      activeCronJob.stop();
    }
    if (freq === 'Disabled' || freq === 0 || freq === '0') {
      console.log(`[SCHEDULER] Automated report generation is disabled.`);
      return;
    }

    let cronStr = '';
    if (freq === 1 || freq === '1') cronStr = '0 * * * *';
    else if (freq === 2 || freq === '2') cronStr = '0 */2 * * *';
    else if (freq === 6 || freq === '6') cronStr = '0 */6 * * *';
    else if (freq === 12 || freq === '12') cronStr = '0 */12 * * *';
    else if (freq === 24 || freq === '24') cronStr = '0 8 * * *';
    else cronStr = `0 */${freq} * * *`;

    activeCronJob = cron.schedule(cronStr, () => {
      runScheduledReportGeneration();
    });
    console.log(`[SCHEDULER] Successfully scheduled automated executive reports with cron: "${cronStr}" (frequency: ${freq}).`);
  };

  scheduleJob(currentFreq);

  setInterval(async () => {
    try {
      const uList = await db.users.find({});
      if (uList && uList.length > 0) {
        const user = uList[0];
        const userFreq = user.reportFrequency || 12;
        if (userFreq !== currentFreq) {
          console.log(`[SCHEDULER] Setting frequency modified by administrator from ${currentFreq} to ${userFreq}.`);
          currentFreq = userFreq;
          scheduleJob(currentFreq);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, 30000);

  setInterval(processRetries, 60000);
}

module.exports = {
  init,
  runScheduledReportGeneration
};
