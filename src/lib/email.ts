type SendArgs = { to: string | string[]; subject: string; html: string };

/**
 * Sends an email via Resend. Safe no-op if RESEND_API_KEY isn't set, so the
 * app works fine before email is configured (invites still get created, etc.).
 */
export async function sendEmail({ to, subject, html }: SendArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Sitewatch <onboarding@resend.dev>";
  if (!apiKey) return { skipped: true as const };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", await res.text());
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (e) {
    console.error("Resend exception:", e);
    return { ok: false as const };
  }
}

const SHELL = (body: string) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F7F8FA;padding:24px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E6E9EE;border-radius:14px;overflow:hidden;">
      <div style="background:#0E5C55;padding:16px 24px;color:#fff;font-weight:700;font-size:18px;">Sitewatch</div>
      <div style="padding:24px;color:#14201E;line-height:1.55;font-size:15px;">${body}</div>
    </div>
    <p style="max-width:480px;margin:12px auto 0;color:#5B6B68;font-size:12px;text-align:center;">Maintenance &amp; compliance</p>
  </div>`;

const BTN = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0E5C55;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:10px;">${label}</a>`;

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  maintenance: "Maintenance",
  care_staff: "Care staff",
  contractor: "Contractor",
};

export function inviteEmail(siteName: string, role: string, appUrl: string, email: string) {
  const link = `${appUrl}/login`;
  return SHELL(`
    <p style="margin:0 0 14px;font-size:18px;font-weight:700;font-family:system-ui;">You've been invited to ${siteName}</p>
    <p style="margin:0 0 18px;">You've been added as <strong>${ROLE_LABEL[role] ?? role}</strong>. To join, sign in with this email address (<strong>${email}</strong>) and tap Accept.</p>
    <p style="margin:0 0 22px;">${BTN(link, "Sign in to accept")}</p>
    <p style="margin:0;color:#5B6B68;font-size:13px;">If you didn't expect this, you can ignore this email.</p>
  `);
}

export function jobAssignedEmail(
  siteName: string,
  title: string,
  appUrl: string,
  expected?: string | null
) {
  return SHELL(`
    <p style="margin:0 0 14px;font-size:18px;font-weight:700;font-family:system-ui;">New job at ${siteName}</p>
    <p style="margin:0 0 8px;">You've been assigned:</p>
    <p style="margin:0 0 18px;font-weight:600;">${title.replace(/</g, "&lt;")}</p>
    ${expected ? `<p style="margin:0 0 18px;">Expected by: <strong>${expected}</strong></p>` : ""}
    <p style="margin:0 0 22px;">${BTN(`${appUrl}/tasks`, "View the job")}</p>
    <p style="margin:0;color:#5B6B68;font-size:13px;">Sign in with this email to see it and update its status.</p>
  `);
}

export function digestEmail(
  siteName: string,
  appUrl: string,
  overdue: { title: string }[],
  chasing: { title: string }[]
) {
  const list = (items: { title: string }[]) =>
    items
      .slice(0, 15)
      .map(
        (i) =>
          `<li style="margin:0 0 4px;">${i.title.replace(/</g, "&lt;")}</li>`
      )
      .join("");

  const sections: string[] = [];
  if (overdue.length) {
    sections.push(`
      <p style="margin:0 0 6px;font-weight:600;color:#DC2626;">${overdue.length} overdue check${overdue.length > 1 ? "s" : ""}</p>
      <ul style="margin:0 0 18px;padding-left:18px;">${list(overdue)}</ul>`);
  }
  if (chasing.length) {
    sections.push(`
      <p style="margin:0 0 6px;font-weight:600;color:#D97706;">${chasing.length} call-out${chasing.length > 1 ? "s" : ""} to chase</p>
      <ul style="margin:0 0 18px;padding-left:18px;">${list(chasing)}</ul>`);
  }

  return SHELL(`
    <p style="margin:0 0 14px;font-size:18px;font-weight:700;font-family:system-ui;">${siteName} — today's compliance</p>
    ${sections.join("")}
    <p style="margin:0 0 4px;">${BTN(`${appUrl}/tasks`, "Open Sitewatch")}</p>
  `);
}
