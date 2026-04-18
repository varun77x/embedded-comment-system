import sanitizeHtml from "sanitize-html";

/**
 * Strips ALL HTML tags from user-submitted content.
 * Only plain text is stored — prevents XSS at the data layer.
 */
export function sanitizeContent(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}
