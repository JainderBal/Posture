// Suppress the webview's default right-click menu (save/print/reload) in
// production. Left enabled in dev so devtools/inspect stay available.
if (!import.meta.env.DEV) {
  window.addEventListener("contextmenu", (event) => event.preventDefault());
}
