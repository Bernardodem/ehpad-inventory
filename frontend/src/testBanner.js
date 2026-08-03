if (window.location.hostname === "test.monaec.fr") {
  const banner = document.createElement("div");
  banner.textContent = "🧪 ENVIRONNEMENT DE TEST";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#E67E22;color:white;text-align:center;font-size:12px;font-weight:bold;padding:4px;letter-spacing:1px;";
  document.body.prepend(banner);
  document.body.style.paddingTop = "24px";
}
