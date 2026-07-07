export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isHtml: boolean;
  labelIds: string[];
  isRead: boolean;
  isStarred: boolean;
}

// Safely decode Base64Url
export function decodeBase64Url(str: string): string {
  if (!str) return "";
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch (e) {
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch {
      return atob(base64);
    }
  }
}

// Recursively parse message parts to find the body
export function getMessageBody(payload: any): { body: string; isHtml: boolean } {
  let bodyText = "";
  let isHtml = false;

  const findPart = (part: any): boolean => {
    if (part.mimeType === "text/html" && part.body?.data) {
      bodyText = decodeBase64Url(part.body.data);
      isHtml = true;
      return true; // HTML is higher priority, stop searching
    }
    if (part.mimeType === "text/plain" && part.body?.data && !isHtml) {
      bodyText = decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        if (findPart(subPart)) return true;
      }
    }
    return false;
  };

  if (payload.parts) {
    for (const part of payload.parts) {
      if (findPart(part)) break;
    }
  } else if (payload.body?.data) {
    bodyText = decodeBase64Url(payload.body.data);
    isHtml = payload.mimeType === "text/html";
  }

  // Fallback: use snippet if body is empty
  if (!bodyText && payload.snippet) {
    bodyText = payload.snippet;
  }

  return { body: bodyText, isHtml };
}

// Helper to extract header value by name
export function getHeader(headers: { name: string; value: string }[], name: string): string {
  if (!headers) return "";
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}

// Parse raw message resource into clear GmailMessage interface
export function parseMessage(msg: any): GmailMessage {
  const headers = msg.payload?.headers || [];
  const subject = getHeader(headers, "subject") || "(Sem Assunto)";
  const from = getHeader(headers, "from") || "Remetente Desconhecido";
  const to = getHeader(headers, "to") || "Destinatário Desconhecido";
  const date = getHeader(headers, "date") || "";
  const { body, isHtml } = getMessageBody(msg.payload || {});
  const labelIds = msg.labelIds || [];

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject,
    from,
    to,
    date,
    snippet: msg.snippet || "",
    body,
    isHtml,
    labelIds,
    isRead: !labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
  };
}

// List messages from Gmail with detailed fields
export async function listGmailMessages(
  token: string,
  options: { labelId?: string; query?: string; maxResults?: number } = {}
): Promise<GmailMessage[]> {
  const { labelId = "INBOX", query = "", maxResults = 15 } = options;
  
  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  
  if (labelId && labelId !== "ALL") {
    url += `&labelIds=${labelId}`;
  }
  
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao listar mensagens: ${res.status}`);
  }

  const data = await res.json();
  if (!data.messages || data.messages.length === 0) {
    return [];
  }

  // Fetch full details for each message in parallel
  const detailPromises = data.messages.map(async (item: { id: string }) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (detailRes.ok) {
        const rawMsg = await detailRes.json();
        return parseMessage(rawMsg);
      }
      return null;
    } catch (e) {
      console.error(`Erro ao buscar detalhes do email ${item.id}:`, e);
      return null;
    }
  });

  const resolved = await Promise.all(detailPromises);
  return resolved.filter((m): m is GmailMessage => m !== null);
}

// Send an email message (using base64url-encoded RFC 2822)
export async function sendGmailEmail(
  token: string,
  payload: { to: string; subject: string; body: string; replyToMessageId?: string; threadId?: string }
): Promise<any> {
  const { to, subject, body, threadId } = payload;
  
  // Format RFC 2822 raw MIME message
  const emailLines = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
  ];

  if (threadId) {
    // If replying, keep thread association
    emailLines.push(`References: <${threadId}@mail.gmail.com>`);
    emailLines.push(`In-Reply-To: <${threadId}@mail.gmail.com>`);
  }

  emailLines.push("");
  // Simple body markdown/text wrapping
  const formattedBody = body.replace(/\n/g, "<br />");
  emailLines.push(formattedBody);

  const emailStr = emailLines.join("\r\n");
  
  // Encode as Base64url (no padding, url-safe)
  const base64Safe = btoa(unescape(encodeURIComponent(emailStr)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const bodyData: any = { raw: base64Safe };
  if (threadId) {
    bodyData.threadId = threadId;
  }

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao enviar e-mail: ${res.status}`);
  }

  return await res.json();
}

// Trash a message (moves to trash bin)
export async function trashGmailMessage(token: string, id: string): Promise<any> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao mover para lixeira: ${res.status}`);
  }

  return await res.json();
}

// Modify message labels (like adding/removing STARRED or UNREAD)
export async function modifyGmailMessageLabels(
  token: string,
  id: string,
  payload: { addLabelIds?: string[]; removeLabelIds?: string[] }
): Promise<any> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao atualizar etiquetas do e-mail: ${res.status}`);
  }

  return await res.json();
}
