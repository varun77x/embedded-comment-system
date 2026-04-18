/**
 * UCS Embed Snippet — host sites include this script once per page.
 *
 * Usage:
 *   <div id="ucs-container"></div>
 *   <script>
 *     window.UCSConfig = { siteId: "YOUR_SITE_ID" };
 *   </script>
 *   <script src="https://your-cdn.com/embed.js" async defer></script>
 */
(function () {
  "use strict";

  var cfg = window.UCSConfig || {};
  var siteId = cfg.siteId;

  if (!siteId) {
    console.error("[UCS] window.UCSConfig.siteId is required");
    return;
  }

  var containerId = cfg.containerId || "ucs-container";
  var pageUrl = cfg.pageUrl || window.location.href;
  // CDN base for the widget app — replaced at deploy time
  var widgetBase = cfg.widgetBase || "https://your-cdn.com";

  var container = document.getElementById(containerId);
  if (!container) {
    console.error("[UCS] Container element #" + containerId + " not found");
    return;
  }

  var iframe = document.createElement("iframe");
  iframe.src =
    widgetBase +
    "/index.html?siteId=" +
    encodeURIComponent(siteId) +
    "&pageUrl=" +
    encodeURIComponent(pageUrl);
  iframe.style.cssText =
    "width:100%;border:none;min-height:400px;display:block;";
  iframe.title = "Comments";
  iframe.loading = "lazy";

  // Resize iframe to fit content height (widget posts its scrollHeight)
  window.addEventListener("message", function (e) {
    if (
      e.data &&
      e.data.type === "UCS_RESIZE" &&
      typeof e.data.height === "number"
    ) {
      iframe.style.height = e.data.height + "px";
    }
  });

  container.appendChild(iframe);
})();
