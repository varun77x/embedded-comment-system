import { render } from "preact";
import { App } from "./components/App.js";
import "./styles.css";

// The widget reads its config from the URL query string when running inside an iframe.
// e.g. /widget.html?siteId=xxx&pageUrl=https://example.com/article
const params = new URLSearchParams(window.location.search);
const siteId = params.get("siteId") ?? "";
const pageUrl = params.get("pageUrl") ?? window.location.href;

const root = document.getElementById("root");
if (root && siteId) {
  render(<App siteId={siteId} pageUrl={pageUrl} />, root);

  // Auto-report height changes to the parent frame so embed.js can resize the iframe
  const ro = new ResizeObserver(() => {
    window.parent.postMessage(
      { type: "UCS_RESIZE", height: document.body.scrollHeight },
      "*"
    );
  });
  ro.observe(document.body);
} else if (!siteId) {
  document.body.innerHTML = "<p style='color:red'>UCS: missing siteId parameter</p>";
}
