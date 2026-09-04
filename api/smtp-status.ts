import nodemailer from "nodemailer";

function getSmtpErrorCode(error: any) {
  if (typeof error?.code === "string") return error.code;
  if (typeof error?.responseCode === "number") return `SMTP_${error.responseCode}`;
  return "SMTP_UNKNOWN";
}

function getSmtpErrorHint(code: string) {
  if (code === "EAUTH" || code === "SMTP_535") {
    return "Gmail refuse l'authentification : utilisez un mot de passe d'application et vérifiez SMTP_USER.";
  }
  if (code === "ECONNECTION" || code === "ETIMEDOUT" || code === "ESOCKET") {
    return "Le serveur SMTP est inaccessible : vérifiez SMTP_HOST, SMTP_PORT et SMTP_SECURE.";
  }
  return "Vérifiez les variables SMTP dans Vercel et consultez les logs du déploiement.";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim().replace(/\s+/g, "");
  const fromAddress = process.env.SMTP_FROM?.trim() || user;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const configured = {
    smtpHost: Boolean(host),
    smtpUser: Boolean(user),
    smtpPass: Boolean(pass),
    adminEmail: Boolean(adminEmail),
    smtpFrom: Boolean(fromAddress),
  };

  if (!host || !user || !pass || !adminEmail) {
    return res.status(503).json({
      configured,
      connected: false,
      message: "La configuration SMTP est incomplète.",
    });
  }

  try {
    const portValue = process.env.SMTP_PORT?.trim() || "587";
    const port = Number(portValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return res.status(503).json({
        configured,
        connected: false,
        message: "SMTP_PORT doit être un port valide.",
      });
    }

    const transporter = host === "smtp.gmail.com" || host.endsWith(".gmail.com")
      ? nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass: pass.replace(/\s+/g, "") },
      })
      : nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465,
        auth: { user, pass },
      });

    await transporter.verify();
    return res.json({
      configured,
      connected: true,
      message: `Connexion SMTP établie avec succès. Expéditeur: ${fromAddress}`,
    });
  } catch (error: any) {
    console.error("[SMTP] Échec du diagnostic de connexion", {
      name: error?.name,
      code: error?.code,
      responseCode: error?.responseCode,
      command: error?.command,
    });
    return res.status(503).json({
      configured,
      connected: false,
      code: getSmtpErrorCode(error),
      message: getSmtpErrorHint(getSmtpErrorCode(error)),
    });
  }
}