const api = globalThis.browser ?? globalThis.chrome;
const button = document.querySelector("#start");
const status = document.querySelector("#status");
const isArchivedCommunity = url => /^https:\/\/web\.archive\.org\/web\/[^/]+\/https?:\/\/[^/]*orkut[^/]*\/c\d+(?:[-.]|$)/i.test(url || "");
button.addEventListener("click", async () => {
  button.disabled = true; status.textContent = "Verificando a página…";
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!isArchivedCommunity(tab?.url)) { status.textContent = "Abra uma comunidade do Orkut preservada em web.archive.org."; button.disabled = false; return; }
    await api.tabs.create({ url: `collector.html?url=${encodeURIComponent(tab.url)}` }); window.close();
  } catch (error) { status.textContent = `Não foi possível iniciar: ${error.message || error}`; button.disabled = false; }
});
