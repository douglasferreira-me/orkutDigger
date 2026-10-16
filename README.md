# Orkut Digger

<p align="center"><img src="assets/orkut-digger-logo.png" width="192" alt="Logo do Orkut Digger"></p>

Extensão para Chrome e Firefox que exporta, em CSV, os tópicos e as respostas disponíveis em uma comunidade do Orkut preservada no [Internet Archive](https://web.archive.org/).

## Como usar

1. Abra a captura de uma comunidade do Orkut em `web.archive.org`.
2. Clique no ícone do Orkut Digger e escolha **Coletar esta comunidade**.
3. Mantenha a aba da coleta aberta. Ela mostra as páginas lidas, a fila e eventuais falhas de captura.
4. Ao fim, escolha **Baixar CSV**. O arquivo contém uma linha por tópico; as respostas são numeradas em uma mesma célula, com autor e data quando preservados.

A extensão visita uma página por segundo e interrompe a coleta após 10.000 páginas, para evitar loops e reduzir a carga sobre o Internet Archive. Falhas de snapshots permanecem registradas no CSV. A coleta só acessa `web.archive.org` e não envia dados a outro servidor.

## Instalação para teste

### Chrome / Chromium

Descompacte `orkut-digger-chrome.zip`, abra `chrome://extensions`, habilite o **Modo do desenvolvedor**, escolha **Carregar sem compactação** e selecione a pasta extraída.

### Firefox

O arquivo `orkut-digger-firefox.xpi` é destinado a teste temporário no Firefox Developer Edition ou Nightly: abra `about:debugging#/runtime/this-firefox`, escolha **Carregar extensão temporária** e selecione o XPI. A instalação permanente no Firefox comum requer a assinatura/publicação futura na Mozilla Add-ons.

## Gerar os pacotes

Execute `./package.sh`. O script cria os dois arquivos na pasta `dist/`; o ZIP do Chrome contém os fontes e o XPI é um pacote ZIP com extensão própria do Firefox.

## Desenvolvimento

Não há dependências de compilação. A lógica de URLs e extração fica em `core.js`; a página `collector.html` mantém a coleta e o checkpoint no IndexedDB da extensão. Verifique a sintaxe com `node --check core.js && node --check collector.js`.

## Parcerias

<p>
  <a href="https://condadolab.org/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/partners/condado-lab.png">
      <img src="assets/partners/condado-lab-light.png" height="64" alt="Condado Lab">
    </picture>
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://oasisufrj.org/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/partners/oasis.png">
      <img src="assets/partners/oasis-light.png" height="64" alt="Oásis — UFRJ">
    </picture>
  </a>
</p>

[Condado Lab](https://condadolab.org/) · [Oásis — UFRJ](https://oasisufrj.org/)

Logos institucionais obtidas nos sites oficiais dos parceiros; pertencem às respectivas instituições.
