import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AWS SES
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: vi.fn().mockImplementation((params) => params),
}));

// Mock KV for cooldown
const mockKvFns = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: mockKvFns,
}));

import {
  sendDownAlert,
  sendRecoveryAlert,
  shouldSendAlert,
  recordAlertSent,
  getAlertRecipients,
} from "./email";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));
});

describe("getAlertRecipients", () => {
  it("parses comma-separated ALERT_RECIPIENTS env var", () => {
    vi.stubEnv("ALERT_RECIPIENTS", "a@test.com, b@test.com");
    const recipients = getAlertRecipients();
    expect(recipients).toEqual(["a@test.com", "b@test.com"]);
    vi.unstubAllEnvs();
  });

  it("defaults to info@exsecute.com when env var is not set", () => {
    vi.stubEnv("ALERT_RECIPIENTS", "");
    const recipients = getAlertRecipients();
    expect(recipients).toEqual(["info@exsecute.com"]);
    vi.unstubAllEnvs();
  });
});

describe("shouldSendAlert", () => {
  it("returns true when no recent alert exists (no cooldown)", async () => {
    mockKvFns.get.mockResolvedValue(null);
    const result = await shouldSendAlert("website", "down");
    expect(result).toBe(true);
    expect(mockKvFns.get).toHaveBeenCalledWith("alert-cooldown:website:down");
  });

  it("returns false when alert was sent within cooldown period", async () => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    mockKvFns.get.mockResolvedValue(thirtyMinAgo);
    const result = await shouldSendAlert("website", "down");
    expect(result).toBe(false);
  });

  it("returns true when alert was sent outside cooldown period", async () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    mockKvFns.get.mockResolvedValue(twoHoursAgo);
    const result = await shouldSendAlert("website", "down");
    expect(result).toBe(true);
  });

  it("uses separate cooldown keys for down and up alerts", async () => {
    mockKvFns.get.mockResolvedValue(null);
    await shouldSendAlert("website", "down");
    await shouldSendAlert("website", "up");
    expect(mockKvFns.get).toHaveBeenCalledWith("alert-cooldown:website:down");
    expect(mockKvFns.get).toHaveBeenCalledWith("alert-cooldown:website:up");
  });
});

describe("recordAlertSent", () => {
  it("stores the current timestamp for the service's typed alert cooldown", async () => {
    await recordAlertSent("website", "down");
    expect(mockKvFns.set).toHaveBeenCalledWith(
      "alert-cooldown:website:down",
      expect.any(Number),
    );
  });
});

describe("sendDownAlert", () => {
  it("sends an email via SES with service down details", async () => {
    vi.stubEnv("ALERT_RECIPIENTS", "test@example.com");
    vi.stubEnv("AWS_REGION", "us-east-1");

    await sendDownAlert("Website", "2026-03-16T12:00:00Z");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentParams = mockSend.mock.calls[0][0];
    expect(sentParams.Destination.ToAddresses).toEqual(["test@example.com"]);
    expect(sentParams.Message.Subject.Data).toContain("Website");
    expect(sentParams.Message.Subject.Data).toContain("Down");

    vi.unstubAllEnvs();
  });
});

describe("sendRecoveryAlert", () => {
  it("sends an email via SES with recovery details including duration", async () => {
    vi.stubEnv("ALERT_RECIPIENTS", "test@example.com");
    vi.stubEnv("AWS_REGION", "us-east-1");

    await sendRecoveryAlert(
      "Website",
      "2026-03-16T12:30:00Z",
      150,
      1800000,
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentParams = mockSend.mock.calls[0][0];
    expect(sentParams.Message.Subject.Data).toContain("Website");
    expect(sentParams.Message.Subject.Data).toContain("Recovered");
    expect(sentParams.Message.Body.Html.Data).toContain("30 minutes");

    vi.unstubAllEnvs();
  });

  it("shows 'unknown' duration when downtimeMs is null", async () => {
    vi.stubEnv("ALERT_RECIPIENTS", "test@example.com");
    vi.stubEnv("AWS_REGION", "us-east-1");

    await sendRecoveryAlert(
      "Website",
      "2026-03-16T12:30:00Z",
      150,
      null,
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentParams = mockSend.mock.calls[0][0];
    expect(sentParams.Message.Body.Html.Data).toContain("unknown");

    vi.unstubAllEnvs();
  });
});
