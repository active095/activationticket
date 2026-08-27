import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const configured = {
    smtpHost: Boolean(host),
    smtpUser: Boolean(user),
    smtpPass: Boolean(pass),
    adminEmail: Boolean(adminEmail),
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
      message: "Connexion SMTP établie avec succès.",
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
      message: "La connexion SMTP a échoué. Consultez les logs Vercel pour le code d'erreur.",
    });
  }
}