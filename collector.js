import { cleanText, communityId, csvCell, discoverLinks, formatResponses, forumUrl, pageKey, pageKind, parseForumTopics, parseProfile, parseReply, parseResponses, parseTopic } from "./core.js";

const api = globalThis.browser ?? globalThis.chrome;
const MAX_PAGES = 10_000;
const REQUEST_DELAY_MS = 1_000;
const rootUrl = new URL(location.href).searchParams.get("url");
const $ = selector => document.querySelector(selector);
let job;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orkut-digger", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("jobs", { keyPath: "id" }); request.result.createObjectStore("topics", { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
const database = await openDatabase();
function transaction(store, mode, action) { return new Promise((resolve, reject) => { const request = action(database.transaction(store, mode).objectStore(store)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
const saveJob = value => transaction("jobs", "readwrite", store => store.put(value));
const loadJobs = () => transaction("jobs", "readonly", store => store.getAll());
const saveTopic = value => transaction("topics", "readwrite", store => store.put(value));
const loadTopics = id => transaction("topics", "readonly", store => store.getAll()).then(values => values.filter(value => value.jobId === id));

function pause(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function update(message = "") {
  $("#title").textContent = job.community?.name || "Coletando comunidade";
  $("#description").textContent = job.community?.description || "Lendo páginas preservadas do fórum.";
  $("#phase").textContent = job.completed ? "Coleta concluída" : job.cancelled ? "Coleta cancelada" : "Coletando";
  $("#counter").textContent = `${job.visited.length} páginas`;
  $("#bar").max = Math.max(job.visited.length + job.queue.length, 1); $("#bar").value = job.visited.length;
  $("#detail").textContent = message || `${job.queue.length} página(s) aguardando na fila.`;
  $("#download").disabled = !job.completed;
  $("#cancel").disabled = job.completed || job.cancelled;
}

async function fetchDocument(url) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return { url: response.url || url, document: new DOMParser().parseFromString(await response.text(), "text/html") };
}
function mergeTopic(current, incoming) {
  const merged = current || { ...incoming, responses: [], errors: [] };
  merged.title ||= incoming.title; merged.url ||= incoming.url;
  const known = new Set(merged.responses.map(response => response.id));
  for (const response of incoming.responses || []) if (!known.has(response.id)) { merged.responses.push(response); known.add(response.id); }
  merged.errors = [...new Set([...(merged.errors || []), ...(incoming.errors || [])])];
  return merged;
}
async function persistTopic(topic) { topic.key = `${job.id}:${topic.id}`; topic.jobId = job.id; await saveTopic(topic); }
async function collect() {
  const topics = new Map((await loadTopics(job.id)).map(topic => [topic.id, topic]));
  const visited = new Set(job.visited);
  while (job.queue.length && !job.cancelled) {
    if (visited.size >= MAX_PAGES) { job.errors.push(`Limite de ${MAX_PAGES} páginas atingido.`); break; }
    const url = job.queue.shift(); const key = pageKey(url); if (visited.has(key)) continue;
    visited.add(key); job.visited = [...visited]; update(`Lendo ${pageKind(url, job.community.id)}…`); await saveJob(job);
    try {
      const fetched = await fetchDocument(url); const kind = pageKind(fetched.url, job.community.id);
      if (kind === "forum") for (const topic of parseForumTopics(fetched.document, fetched.url, job.community.id)) { const merged = mergeTopic(topics.get(topic.id), topic); topics.set(topic.id, merged); await persistTopic(merged); }
      if (kind === "topic") { const parsed = parseTopic(fetched.document, fetched.url); if (parsed.id) { parsed.responses = parseResponses(fetched.document, fetched.url, parsed); const merged = mergeTopic(topics.get(parsed.id), parsed); topics.set(parsed.id, merged); await persistTopic(merged); } }
      if (kind === "reply") { const parsed = parseReply(fetched.document, fetched.url); if (parsed.id) { const merged = mergeTopic(topics.get(parsed.id), parsed); topics.set(parsed.id, merged); await persistTopic(merged); } }
      for (const link of discoverLinks(fetched.document, fetched.url, job.community.id)) if (!visited.has(pageKey(link))) job.queue.push(link);
    } catch (error) {
      const kind = pageKind(url, job.community.id); const id = kind === "topic" ? url.match(/-t([^-./?#]+)/i)?.[1] : "";
      if (id) { const failed = mergeTopic(topics.get(id), { id, title: "", url, responses: [], errors: [String(error.message || error)] }); topics.set(id, failed); await persistTopic(failed); }
      job.errors.push(`${kind}: ${url} — ${error.message || error}`);
    }
    await saveJob(job); update(); await pause(REQUEST_DELAY_MS);
  }
  job.completed = !job.cancelled; await saveJob(job); update(job.completed ? `Pronto: ${(await loadTopics(job.id)).length} tópico(s) encontrados.` : "Coleta interrompida. Você pode reabrir esta página para retomar.");
}

function safeName(value) { return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "comunidade-orkut"; }
async function downloadCsv() {
  const topics = (await loadTopics(job.id)).sort((a, b) => String(a.title).localeCompare(String(b.title), "pt-BR"));
  const header = ["comunidade_id", "comunidade_nome", "comunidade_descricao", "comunidade_url", "topico_id", "topico_titulo", "topico_url", "respostas", "total_respostas", "erros_coleta"];
  const rows = topics.map(topic => [job.community.id, job.community.name, job.community.description, job.community.url, topic.id, topic.title, topic.url, formatResponses(topic.responses), topic.responses.length, topic.errors.join(" | ")]);
  if (job.errors.length) rows.push([job.community.id, job.community.name, job.community.description, job.community.url, "", "", "", "", "", job.errors.join(" | ")]);
  const blob = new Blob([`\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); await api.downloads.download({ url, filename: `orkut-digger-${safeName(job.community.name)}.csv`, saveAs: true }); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
$("#cancel").addEventListener("click", async () => { job.cancelled = true; await saveJob(job); update("Cancelando após a página atual…"); });
$("#download").addEventListener("click", downloadCsv);

if (!rootUrl || !communityId(rootUrl)) { $("#title").textContent = "Endereço inválido"; $("#detail").textContent = "Abra esta página a partir do botão da extensão em uma comunidade preservada."; $("#cancel").disabled = true; }
else {
  const previous = (await loadJobs()).find(candidate => candidate.rootUrl === rootUrl && !candidate.completed && !candidate.cancelled);
  if (previous) { job = previous; update("Retomando uma coleta interrompida…"); collect(); }
  else {
    const profile = await fetchDocument(rootUrl); const community = { ...parseProfile(profile.document, profile.url), id: communityId(profile.url) };
    job = { id: crypto.randomUUID(), rootUrl, community, queue: [forumUrl(profile.url, community.id)], visited: [], errors: [], completed: false, cancelled: false, startedAt: new Date().toISOString() };
    await saveJob(job); update("Localizando as páginas do fórum…"); collect();
  }
}
