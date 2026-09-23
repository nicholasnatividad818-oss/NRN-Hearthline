let deferredInstall = null;
const installBtn = document.getElementById("install-btn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (installBtn) installBtn.classList.remove("hidden");
});
if (installBtn) {
  installBtn.onclick = async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    installBtn.classList.add("hidden");
  };
}
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  if (installBtn) installBtn.classList.add("hidden");
});
