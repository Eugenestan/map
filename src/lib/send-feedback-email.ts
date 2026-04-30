import nodemailer from "nodemailer";

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  suggestion: "Предложение",
  bug_report: "Сообщить об ошибке",
  complaint: "Пожаловаться",
};

function getFeedbackTypeLabel(feedbackType: string): string {
  return FEEDBACK_TYPE_LABELS[feedbackType] ?? feedbackType;
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

export async function sendFeedbackEmail(input: {
  name: string;
  email: string;
  feedbackType: string;
  message: string;
}): Promise<void> {
  const to = (process.env.FEEDBACK_TO_EMAIL || "steveji1@gmail.com").trim();
  const from = (process.env.EMAIL_FROM || process.env.SMTP_USER || "").trim();
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

  if (process.env.NODE_ENV === "development" && !isSmtpConfigured()) {
    console.info("[feedback] dev: SMTP не настроен, письмо не отправлено", { to, subject, text });
    return;
  }

  if (!isSmtpConfigured()) {
    throw new Error("SMTP не настроен для отправки обратной связи");
  }

  if (!from) {
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
  });

  await transporter.sendMail({
    from,
    to,
    replyTo: input.email,
    subject,
    text,
  });
}
