const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../db');

// Ensure base report directories exist
const STORAGE_REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(STORAGE_REPORTS_DIR)) {
  fs.mkdirSync(STORAGE_REPORTS_DIR, { recursive: true });
}

// Compile PDF report dynamically
async function generatePDFReport(reportData, filename) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filePath = path.join(STORAGE_REPORTS_DIR, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // ZENTRIX Premium Cyber Branding styling
      const primaryColor = '#0f172a'; // Deep slate
      const accentColor = '#3b82f6';  // Cyber blue
      const redColor = '#ef4444';     // Danger
      const greenColor = '#10b981';   // Success

      // HEADER
      doc.rect(0, 0, 600, 20).fill(primaryColor);
      doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold').text('ZENTRIX SECURITY OPERATIONS CENTER', 40, 50);
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('CONFIDENTIAL // LOCAL-FIRST SECURE AUDIT REPORT', 40, 78);
      
      doc.moveTo(40, 92).lineTo(550, 92).strokeColor('#e2e8f0').lineWidth(2).stroke();

      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold').text(`${reportData.title}`, 40, 110);
      doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`Ingestion Interval Date: ${new Date().toLocaleString()}`, 40, 130);
      doc.text(`Host workstation: ${require('os').hostname()} // User: system-scheduled`, 40, 146);

      // KPI TABLE
      doc.rect(40, 180, 510, 80).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
      
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('KEY METRICS PERFORMANCE REPORT', 55, 195);
      doc.fontSize(9).font('Helvetica');
      doc.fillColor('#475569').text(`Logs Ingred: ${reportData.eventsCount}`, 55, 215);
      doc.text(`Active Security Alerts: ${reportData.alertsCount}`, 55, 230);
      doc.text(`Host Endpoints Connected: ${reportData.endpointCount}`, 300, 215);
      doc.text(`Critical Breaches: ${reportData.criticalCount}`, 300, 230);

      // POSTURES
      doc.rect(40, 285, 240, 90).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('ZENTRIX SAFETY postURE', 55, 298);
      doc.fontSize(28).fillColor(reportData.securityScore > 75 ? greenColor : redColor).text(`${reportData.securityScore}%`, 55, 315);
      doc.fontSize(8).fillColor('#64748b').font('Helvetica').text('Based on active incidents severity ratings.', 55, 355);

      doc.rect(310, 285, 240, 90).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('RISK INDEX THRESHOLD', 325, 298);
      doc.fontSize(28).fillColor(reportData.riskScore > 50 ? redColor : greenColor).text(`${reportData.riskScore}%`, 325, 315);
      doc.fontSize(8).fillColor('#64748b').font('Helvetica').text('Aggregated metric anomalies calculation.', 325, 355);

      // ALERTS
      doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('DASHBOARD ACTIVE THREAT triAGES', 40, 405);
      doc.moveTo(40, 420).lineTo(550, 420).strokeColor('#e2e8f0').lineWidth(1).stroke();

      let y = 435;
      if (reportData.recentAlerts.length === 0) {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('No active malware or scans triggered inside this logs frame.', 50, y);
        y += 20;
      } else {
        reportData.recentAlerts.forEach((alert) => {
          doc.rect(40, y, 6, 24).fill(alert.severity === 'CRITICAL' ? redColor : '#f59e0b');
          doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(alert.title, 55, y);
          doc.fillColor('#475569').fontSize(8).font('Helvetica').text(`Device: ${alert.host}  |  Category: ${alert.category}  |  Status: ${alert.status}`, 55, y + 12);
          y += 32;
        });
      }

      // REMEDIATIONS
      doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('ZENTRIX THREAT REMEDIATION ACTION', 40, y + 10);
      doc.moveTo(40, y + 25).lineTo(550, y + 25).strokeColor('#e2e8f0').lineWidth(1).stroke();
      
      y += 35;
      const remedies = [
        'Inspect suspicious EDR process spawns flagged by threat signatures.',
        'Retract files modifications caught inside EDR directories integrity watches.',
        'Review honeypot connection logs from alternate SSH ports scanners.'
      ];
      remedies.forEach((r, idx) => {
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(`${idx + 1}.`, 45, y);
        doc.fillColor('#334155').font('Helvetica').text(r, 60, y);
        y += 16;
      });

      // FOOTER
      doc.fillColor('#94a3b8').fontSize(7).text('LOCAL ZENTRIX SYSTEM DISPATCH ENGINE // CONFIDENTIAL SECURITY AUDITING DATA', 40, 780);

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', err => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

// Compile CSV report
async function generateCSVReport(reportData, filename) {
  const filePath = path.join(STORAGE_REPORTS_DIR, filename);
  const headers = 'Metric,Value\n';
  const rows = [
    `Report Title,${reportData.title}`,
    `Timestamp,${new Date().toISOString()}`,
    `Total Logs Ingested,${reportData.eventsCount}`,
    `Active Alerts,${reportData.alertsCount}`,
    `Endpoints Monitored,${reportData.endpointCount}`,
    `Security Score %,${reportData.securityScore}`,
    `Risk Index %,${reportData.riskScore}`
  ].join('\n');
  
  fs.writeFileSync(filePath, headers + rows);
  return filePath;
}

// Compile JSON report
async function generateJSONReport(reportData, filename) {
  const filePath = path.join(STORAGE_REPORTS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
  return filePath;
}

// Orchestrator to generate actual report file formats
async function compileSecurityReports(recipientEmail, reportType = 'Executive Summary') {
  // 1. Gather stats from DB
  const totalEvents = await db.logs.countDocuments({});
  const totalAlerts = await db.alerts.countDocuments({});
  const criticalCount = await db.alerts.countDocuments({ severity: 'CRITICAL' });
  const highCount = await db.alerts.countDocuments({ severity: 'HIGH' });
  const endpointsCount = await db.endpoints.countDocuments({});
  
  const securityScore = Math.max(30, 96 - (criticalCount * 5 + highCount * 2));
  const riskScore = Math.min(100, (criticalCount * 12 + highCount * 4));

  const recentAlerts = await db.alerts.find({}, 4);

  const reportData = {
    title: `ZENTRIX SOC ${reportType} Report`,
    eventsCount: totalEvents,
    alertsCount: totalAlerts,
    criticalCount,
    endpointCount: endpointsCount,
    securityScore,
    riskScore,
    recentAlerts
  };

  const stamp = Date.now();
  const pdfName = `ZENTRIX_Report_${stamp}.pdf`;
  const csvName = `ZENTRIX_Report_${stamp}.csv`;
  const jsonName = `ZENTRIX_Report_${stamp}.json`;

  // Compile three formats concurrently
  await Promise.all([
    generatePDFReport(reportData, pdfName),
    generateCSVReport(reportData, csvName),
    generateJSONReport(reportData, jsonName)
  ]);

  // Save report record in DB
  const savedReport = await db.reports.create({
    timestamp: new Date(),
    title: reportData.title,
    deliveryStatus: 'Pending',
    recipient: recipientEmail || 'admin@zentrix.local',
    alertsCount: totalAlerts,
    endpointCount: endpointsCount,
    securityScore,
    fileName: pdfName
  });

  return {
    report: savedReport,
    pdfPath: path.join(STORAGE_REPORTS_DIR, pdfName),
    csvPath: path.join(STORAGE_REPORTS_DIR, csvName),
    jsonPath: path.join(STORAGE_REPORTS_DIR, jsonName),
    pdfName,
    csvName,
    jsonName
  };
}

module.exports = {
  compileSecurityReports
};
