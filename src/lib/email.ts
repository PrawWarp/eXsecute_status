import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { kv } from "@vercel/kv";
import { formatDuration } from "./format";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const SENDER = "status@exsecute.com";

function getSesClient(): SESClient {
  return new SESClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
}

export function getAlertRecipients(): string[] {
  const raw = process.env.ALERT_RECIPIENTS?.trim();
  if (!raw) return ["info@exsecute.com"];
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

/**
 * Check if we should send an alert for this service (respects cooldown).
 * Uses separate keys for down/up so a recovery alert is never suppressed
 * by a recent down alert.
 */
export async function shouldSendAlert(serviceId: string, type: "down" | "up"): Promise<boolean> {
  const lastSent = await kv.get<number>(`alert-cooldown:${serviceId}:${type}`);
  if (lastSent === null) return true;
  return Date.now() - lastSent >= COOLDOWN_MS;
}

/**
 * Record that an alert was just sent for this service.
 */
export async function recordAlertSent(serviceId: string, type: "down" | "up"): Promise<void> {
  await kv.set(`alert-cooldown:${serviceId}:${type}`, Date.now());
}

/**
 * Send a "service down" alert email.
 */
export async function sendDownAlert(
  serviceName: string,
  timestamp: string,
): Promise<void> {
  const ses = getSesClient();
  const recipients = getAlertRecipients();

  await ses.send(
    new SendEmailCommand({
      Source: SENDER,
      Destination: { ToAddresses: recipients },
      Message: {
        Subject: { Data: `[eXsecute] ${serviceName} is Down` },
        Body: {
          Html: {
            Data: `
              <h2>${serviceName} is Down</h2>
              <p><strong>Detected at:</strong> ${new Date(timestamp).toUTCString()}</p>
              <p>The service failed consecutive health checks and has been marked as down.</p>
              <p>Visit <a href="https://status.exsecute.com">status.exsecute.com</a> for current status.</p>
            `,
          },
        },
      },
    }),
  );
}

/**
 * Send a "service recovered" alert email.
 */
export async function sendRecoveryAlert(
  serviceName: string,
  timestamp: string,
  responseTimeMs: number | null,
  downtimeMs: number | null,
): Promise<void> {
  const ses = getSesClient();
  const recipients = getAlertRecipients();
  const duration = downtimeMs !== null ? formatDuration(downtimeMs) : "unknown";

  await ses.send(
    new SendEmailCommand({
      Source: SENDER,
      Destination: { ToAddresses: recipients },
      Message: {
        Subject: { Data: `[eXsecute] ${serviceName} has Recovered` },
        Body: {
          Html: {
            Data: `
              <h2>${serviceName} has Recovered</h2>
              <p><strong>Recovered at:</strong> ${new Date(timestamp).toUTCString()}</p>
              <p><strong>Downtime duration:</strong> ${duration}</p>
              ${responseTimeMs !== null ? `<p><strong>Response time:</strong> ${responseTimeMs}ms</p>` : ""}
              <p>Visit <a href="https://status.exsecute.com">status.exsecute.com</a> for current status.</p>
            `,
          },
        },
      },
    }),
  );
}

