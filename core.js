export function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }

export function originalUrl(url) {
  const match = String(url || "").match(/\/web\/[^/]+\/(https?:\/\/.+)$/i);
  return match ? match[1] : String(url || "");
}

export function archivePrefix(url) {
  const match = String(url || "").match(/^(https?:\/\/web\.archive\.org\/web\/[^/]+\/)/i);
  return match ? match[1] : "";
}

export function normalizeArchiveUrl(currentUrl, href) {
  if (!href || /^(?:javascript:|mailto:|#)/i.test(href)) return "";
  if (/^https?:\/\/web\.archive\.org\/web\//i.test(href)) return href;
  const prefix = archivePrefix(currentUrl);
  if (!prefix) return "";
  try { return `${prefix}${new URL(href, originalUrl(currentUrl)).href}`; } catch { return ""; }
}

export function communityId(url) {
  const match = originalUrl(url).match(/\/c(\d+)(?:[-.]|$)/i);
  return match ? match[1] : "";
}

export function pageKind(url, id) {
  let path = ""; try { path = new URL(originalUrl(url)).pathname; } catch { return "forum"; }
  if (new RegExp(`/c${id}-t[^/]*-r[^/]*\\.html$`, "i").test(path)) return "reply";
  if (new RegExp(`/c${id}-t[^/]*\\.html$`, "i").test(path)) return "topic";
  return "forum";
}

export function pageKey(url) {
  try { const parsed = new URL(originalUrl(url)); parsed.search = ""; parsed.hash = ""; return parsed.href.toLowerCase(); }
  catch { return String(url || "").toLowerCase(); }
}

export function topicId(url) { const match = originalUrl(url).match(/-t([^-./?#]+)/i); return match ? match[1] : ""; }
export function forumUrl(profileUrl, id) { return profileUrl.replace(new RegExp(`c${id}(?:-[^/?#]+)?\\.html`, "i"), `c${id}-f.html`); }

export function discoverLinks(document, currentUrl, id) {
  const allowed = new RegExp(`(?:^|/)c${id}-(?:f[^/?#]*|t[^/?#]*)\\.html(?:[?#]|$)`, "i");
  const found = new Map();
  for (const anchor of document.querySelectorAll("a[href]")) {
    const url = normalizeArchiveUrl(currentUrl, anchor.getAttribute("href"));
    if (url && allowed.test(originalUrl(url))) found.set(pageKey(url), url);
  }
  const matches = document.documentElement.innerHTML.match(new RegExp(`c${id}-(?:f|t)[a-z0-9-]*\\.html`, "ig")) || [];
  for (const match of matches) { const url = normalizeArchiveUrl(currentUrl, match); if (url) found.set(pageKey(url), url); }
  return [...found.values()];
}

export function parseProfile(document, currentUrl) {
  const firstText = selectors => {
    for (const selector of selectors) { const node = document.querySelector(selector); if (cleanText(node?.textContent)) return cleanText(node.textContent); }
    return "";
  };
  return { name: firstText(["h1", ".communityTitle", ".communityProfileTitle", "title"]) || document.title, description: firstText([".communityDescription", ".description", ".communityProfileDescription"]), url: currentUrl };
}

export function parseForumTopics(document, currentUrl, id) {
  const topics = new Map();
  for (const anchor of document.querySelectorAll("a[href]")) {
    const url = normalizeArchiveUrl(currentUrl, anchor.getAttribute("href"));
    if (!url || pageKind(url, id) !== "topic") continue;
    const key = topicId(url);
    if (key) topics.set(key, { id: key, title: cleanText(anchor.textContent), url, responses: [], errors: [] });
  }
  return [...topics.values()];
}

export function parseTopic(document, currentUrl) {
  const node = document.querySelector(".messageMetadata.forumMetadata .typoSectionTitleFont,h1,h2.typoSectionTitleFont,.topicTitle,.forumTopicTitle,title");
  const title = cleanText(node?.textContent).replace(/\s+-\s+\d+\s+(?:respostas?|repl(?:y|ies)).*$/i, "");
  return { id: topicId(currentUrl), title, url: currentUrl, responses: [], errors: [] };
}

export function parseResponses(document, currentUrl, topic) {
  let nodes = [];
  for (const selector of ["div.forumPost", "div.topicReply", "div.message", "div.listItem", "div[id^='message']", "div[id^='reply']"]) { nodes = [...document.querySelectorAll(selector)]; if (nodes.length) break; }
  return nodes.map((node, index) => {
    const body = node.querySelector(".messageBody,.postText,.replyText,.body") || node;
    return { id: node.dataset.id || node.id || `${topic.id}-${index + 1}`, author: cleanText(node.querySelector(".author,.userName,.profileName,a[href*='p']")?.textContent), date: cleanText(node.querySelector(".date,.postDate,.timestamp,time")?.textContent), text: cleanText(body.innerText || body.textContent), url: currentUrl };
  }).filter(response => response.text);
}

export function formatResponses(responses) { return responses.map((response, index) => `${index + 1}. ${response.author || response.date ? `[${[response.author, response.date].filter(Boolean).join(" — ")}] ` : ""}${response.text}`).join("\n\n"); }
export function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
