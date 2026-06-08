import nodemailer from "nodemailer";

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  suggestion: "Предложение",
  bug_report: "Сообщить об ошибке",
  complaint: "Пожаловаться",
};

function getFeedbackTypeLabel(feedbackType: string): string {
  return FEEDBACK_TYPE_LABELS[feedbackType] ?? feedbackType;
}

type FeedbackInput = {
  name: string;
  email: string;
  feedbackType: string;
  message: string;
};

type Letter = {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  text: string;
  replyTo: string;
};

function buildLetter(input: FeedbackInput): Letter {
  const to = (process.env.FEEDBACK_TO_EMAIL || "steveji1@gmail.com").trim();
  const from = (process.env.EMAIL_FROM || process.env.SMTP_USER || "").trim();
  const fromName = (process.env.EMAIL_FROM_NAME || "VietRadar Feedback").trim();
  const typeLabel = getFeedbackTypeLabel(input.feedbackType);
  const subject = `[Обратная связь] ${typeLabel} — ${input.name}`;
  const text = [
    `Имя: ${input.name}`,
    `Почта для ответа: ${input.email}`,
    `Тип обращения: ${typeLabel}`,
    "",
    "Сообщение:",
    input.message,
  ].join("\n");
  return { to, from, fromName, subject, text, replyTo: input.email };
}

function isUnisenderGoConfigured(): boolean {
  return Boolean(process.env.UNISENDER_GO_API_KEY?.trim());
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

async function sendViaUnisenderGo(letter: Letter): Promise<void> {
  if (!letter.from) {
    throw new Error("Укажите EMAIL_FROM (адрес с подтверждённого домена в UniSender Go)");
  }

  // У аккаунтов UniSender Go два дата-центра: go1 и go2. По умолчанию — go1.
  const host = (process.env.UNISENDER_GO_HOST || "go1.unisender.ru").trim();
  const endpoint = `https://${host}/ru/transactional/api/v1/email/send.json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-API-KEY": process.env.UNISENDER_GO_API_KEY!.trim(),
      },
      body: JSON.stringify({
        message: {
          recipients: [{ email: letter.to }],
          from_email: letter.from,
          from_name: letter.fromName,
          reply_to: letter.replyTo,
          subject: letter.subject,
          body: { plaintext: letter.text },
          skip_unsubscribe: 1,
          track_links: 0,
          track_read: 0,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`UniSender Go HTTP ${response.status}: ${detail.slice(0, 400)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaSmtp(letter: Letter): Promise<void> {
  if (!letter.from) {
    throw new Error("Укажите EMAIL_FROM или SMTP_USER для отправителя");
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && port === 465);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });

  await transporter.sendMail({
    from: `${letter.fromName} <${letter.from}>`,
    to: letter.to,
    replyTo: letter.replyTo,
    subject: letter.subject,
    text: letter.text,
  });
}

export async function sendFeedbackEmail(input: FeedbackInput): Promise<void> {
  const letter = buildLetter(input);

  if (isUnisenderGoConfigured()) {
    await sendViaUnisenderGo(letter);
    return;
  }

  if (process.env.NODE_ENV === "development" && !isSmtpConfigured()) {
    console.info("[feedback] dev: транспорт не настроен, письмо не отправлено", {
      to: letter.to,
      subject: letter.subject,
      text: letter.text,
    });
    return;
  }

  if (!isSmtpConfigured()) {
    throw new Error("Email-транспорт не настроен (нет ни UNISENDER_GO_API_KEY, ни SMTP_*)");
  }

  await sendViaSmtp(letter);
}
