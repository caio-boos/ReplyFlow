function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Converts inline markdown to HTML:
 * - [label](url) → styled anchor
 * - **bold** → <strong>
 */
function parseInline(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      (_, label, url) =>
        `<a href="${url}" style="color:#2563eb;text-decoration:none;font-weight:500;border-bottom:1px solid #bfdbfe">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/**
 * Converts the AI plain-text reply into a clean, professional HTML email.
 * Keeps inline CSS for maximum email-client compatibility.
 */
export function renderEmailHtml(text: string, storeName: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map((block) => {
      const lines = block.split("\n").map(parseInline).join("<br>");
      return `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151">${lines}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f3f4f6;padding:40px 16px;min-width:320px">
    <tr>
      <td align="center" valign="top">

        <!-- Card -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0"
          style="max-width:580px;width:100%;background-color:#ffffff;border-radius:6px;
                 border:1px solid #e5e7eb;overflow:hidden">

          <!-- Top accent bar -->
          <tr>
            <td style="height:4px;background-color:#1d4ed8;font-size:0;line-height:0">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 24px 48px">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider + footer -->
          <tr>
            <td style="padding:16px 48px 24px 48px;border-top:1px solid #e5e7eb;background-color:#f9fafb">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
                ${escapeHtml(storeName)}
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
