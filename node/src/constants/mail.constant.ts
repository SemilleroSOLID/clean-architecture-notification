import "dotenv/config";

// SMTP and retries by environment variables (see .env.example). The defaults point to Mailpit from docker-compose.yml.
export const MAIL_CONFIG = {
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.MAIL_FROM || "Servicios Universidad de Caldas <notificaciones@ucaldas.test>",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  maxAttempts: Number(process.env.EMAIL_MAX_ATTEMPTS || 3),
  retryDelayMs: Number(process.env.EMAIL_RETRY_DELAY_MS || 2000),
};
