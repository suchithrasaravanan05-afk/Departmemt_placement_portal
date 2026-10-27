const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const { createCertificatePdf } = require(path.join(__dirname, "../../frontend/certificate_assets.js"));

const CONFIG_PATH = path.join(__dirname, "../email_config.json");

// Load stored email configuration or fallback to process.env
function getEmailConfig() {
    let stored = {};
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            stored = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        } catch (e) {
            console.error("Failed to parse email_config.json:", e);
        }
    }

    const senderEmail = (stored.sender_email || process.env.EMAIL_USER || "").trim();
    const appPassword = (stored.app_password || process.env.EMAIL_PASS || "").trim().replace(/\s+/g, "");
    const senderName = stored.sender_name || "RIT CSBS Department Placement Cell";
    const replyTo = stored.reply_to || senderEmail;

    return {
        sender_email: senderEmail,
        app_password: appPassword,
        sender_name: senderName,
        reply_to: replyTo,
        is_configured: Boolean(senderEmail && appPassword)
    };
}

// Save email configuration
function saveEmailConfig(config) {
    const current = getEmailConfig();
    const updated = {
        sender_email: (config.sender_email !== undefined ? config.sender_email : current.sender_email).trim(),
        app_password: (config.app_password !== undefined ? config.app_password : current.app_password).trim(),
        sender_name: config.sender_name || current.sender_name || "RIT CSBS Department Placement Cell",
        reply_to: config.reply_to || config.sender_email || current.reply_to
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf8");
    return getEmailConfig();
}

// Create Nodemailer Transporter
function getTransporter() {
    const config = getEmailConfig();
    if (!config.is_configured) {
        throw new Error("Email sender is not configured. Please provide Sender Gmail and App Password in Email Settings.");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: config.sender_email,
            pass: config.app_password
        }
    });
}

// Verify SMTP connection
async function verifyConnection() {
    const config = getEmailConfig();
    if (!config.is_configured) {
        return { success: false, message: "Email credentials not configured." };
    }
    try {
        const transporter = getTransporter();
        await transporter.verify();
        return { success: true, message: `Connected to Gmail as ${config.sender_email}` };
    } catch (err) {
        return { success: false, message: err.message || "Failed to authenticate with Gmail SMTP." };
    }
}

// Generate Certificate PDF Buffer
async function generateCertificatePdfBuffer(certData) {
    const doc = await createCertificatePdf(certData);
    const arrayBuf = doc.output("arraybuffer");
    return Buffer.from(arrayBuf);
}

// Build branded HTML email body
function buildCertificateEmailHtml(certData) {
    const recipientName = certData.participant_name || certData.student_name || "Participant";
    const certNumber = certData.certificate_number || "RIT-CERT";
    const eventName = certData.event_name || "Department Event";
    const progTitle = certData.programme_title || "Training Programme";
    const progDates = certData.programme_dates || "";
    const verifyUrl = `https://rit-csbs-portal.vercel.app/verify/${encodeURIComponent(certNumber)}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Certificate of Participation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f3fb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e1b4b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f3fb;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(76,29,149,0.08);border:1px solid #e9d5ff;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #6b21a8 100%);padding:28px 24px;text-align:center;border-bottom:3px solid #d97706;">
              <div style="color:#fef08a;font-size:12px;letter-spacing:2px;font-weight:700;text-transform:uppercase;margin-bottom:6px;">
                Ramco Institute of Technology, Rajapalayam
              </div>
              <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">
                Department of Computer Science & Business Systems
              </div>
              <div style="color:#e9d5ff;font-size:11px;margin-top:4px;">
                (An Autonomous Institution &bull; NAAC A+ Accredited)
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 30px 24px 30px;">
              <h2 style="color:#3b0764;font-size:22px;margin:0 0 14px 0;font-weight:700;">
                Dear ${escapeHtml(recipientName)},
              </h2>
              <p style="font-size:14.5px;line-height:1.65;color:#334155;margin:0 0 18px 0;">
                Congratulations! We are delighted to award your official <strong>Certificate of Participation</strong> for successfully participating in:
              </p>

              <!-- Event Highlight Box -->
              <div style="background:#faf5ff;border-left:4px solid #7c3aed;border-radius:6px;padding:16px 20px;margin:0 0 24px 0;">
                <div style="font-size:12px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                  ${escapeHtml(progTitle)}
                </div>
                <div style="font-size:16px;font-weight:700;color:#1e1b4b;line-height:1.4;">
                  “${escapeHtml(eventName)}”
                </div>
                ${progDates ? `<div style="font-size:12.5px;color:#64748b;margin-top:6px;"><strong>Dates:</strong> ${escapeHtml(progDates)}</div>` : ''}
              </div>

              <!-- Certificate Details Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:6px 10px;font-size:12.5px;color:#64748b;width:40%;">Certificate ID:</td>
                  <td style="padding:6px 10px;font-size:13.5px;font-weight:700;color:#2e1065;font-family:monospace;">${escapeHtml(certNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;font-size:12.5px;color:#64748b;">Participant Name:</td>
                  <td style="padding:6px 10px;font-size:13px;font-weight:600;color:#1e293b;">${escapeHtml(recipientName)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;font-size:12.5px;color:#64748b;">Verification Status:</td>
                  <td style="padding:6px 10px;font-size:12.5px;color:#16a34a;font-weight:700;">✅ Digitally Verified & Authentic</td>
                </tr>
              </table>

              <!-- Attachment Note -->
              <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin-bottom:26px;">
                <table cellspacing="0" cellpadding="0" width="100%">
                  <tr>
                    <td width="30" valign="middle" style="font-size:22px;">📎</td>
                    <td valign="middle" style="font-size:13.5px;color:#854d0e;line-height:1.4;">
                      <strong>Print-Ready PDF Attached:</strong> Your high-resolution certificate with institutional branding, official signatures, and cryptographic QR code is attached to this email.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Action Button -->
              <div style="text-align:center;margin:28px 0 20px 0;">
                <a href="${verifyUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #4c1d95, #6b21a8);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:30px;box-shadow:0 4px 14px rgba(76,29,149,0.25);">
                  Verify Certificate Online &rarr;
                </a>
              </div>

              <div style="font-size:12px;color:#94a3b8;text-align:center;">
                Verification Link: <a href="${verifyUrl}" style="color:#7c3aed;text-decoration:underline;">${verifyUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
              <div style="font-weight:700;color:#334155;margin-bottom:4px;">
                Ramco Institute of Technology — Department of CSBS
              </div>
              <div>
                North Vagananjankulam, Rajapalayam &ndash; 626 117, Tamil Nadu, India
              </div>
              <div style="margin-top:6px;font-size:11px;color:#94a3b8;">
                This is an automated institutional email notification generated by the RIT CSBS Placement & Training Portal.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Send a single certificate email
async function sendSingleCertificateEmail(certData, recipientEmailOverride = null, options = {}) {
    const config = getEmailConfig();
    const recipientEmail = (recipientEmailOverride || certData.student_email || certData.email || "").trim();

    if (!recipientEmail || !recipientEmail.includes("@")) {
        throw new Error(`Invalid or missing recipient email for ${certData.participant_name || certData.student_name || 'Participant'}`);
    }

    const transporter = getTransporter();
    const recipientName = certData.participant_name || certData.student_name || "Participant";
    const certNumber = certData.certificate_number || "RIT-CERT";
    const eventName = certData.event_name || "Department Event";

    // Generate the certificate PDF
    const pdfBuffer = await generateCertificatePdfBuffer(certData);

    // Sanitize participant name for PDF filename (spaces -> underscores, strip invalid characters)
    let safeParticipantName = String(recipientName || "Certificate").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-\.]/g, "").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    if (!safeParticipantName) safeParticipantName = "Certificate";
    const attachmentPdfFilename = `${safeParticipantName}.pdf`;

    const isTest = Boolean(options && options.isTestMode);
    const subjectPrefix = isTest ? "[TEST MODE] " : "";
    let emailHtml = buildCertificateEmailHtml(certData);

    if (isTest) {
        const testNotice = `
        <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:12px 18px;margin:16px 20px 0;font-family:sans-serif;font-size:13px;color:#92400e;">
            <strong>⚠️ [TEST MODE ACTIVE]:</strong> This certificate email was dispatched in authorized test mode to verify PDF formatting and institutional delivery. 
            <div style="margin-top:4px;font-size:12px;color:#78350f;">Intended Recipient: <strong>${escapeHtml(recipientName)}</strong> (${escapeHtml(certData.student_email || certData.email || 'N/A')})</div>
        </div>`;
        emailHtml = emailHtml.replace('<body style="margin:0;padding:0;', '<body style="margin:0;padding:0;' + testNotice);
    }

    const mailOptions = {
        from: `"${config.sender_name}" <${config.sender_email}>`,
        to: recipientEmail,
        replyTo: config.reply_to || config.sender_email,
        subject: `${subjectPrefix}Certificate of Participation: ${eventName} — ${recipientName}`,
        html: emailHtml,
        attachments: [
            {
                filename: attachmentPdfFilename,
                content: pdfBuffer,
                contentType: "application/pdf"
            }
        ]
    };

    const info = await transporter.sendMail(mailOptions);
    return {
        success: true,
        messageId: info.messageId,
        recipient: recipientEmail,
        certificate_number: certNumber,
        is_test_mode: isTest
    };
}

module.exports = {
    getEmailConfig,
    saveEmailConfig,
    verifyConnection,
    sendSingleCertificateEmail,
    generateCertificatePdfBuffer,
    buildCertificateEmailHtml
};
