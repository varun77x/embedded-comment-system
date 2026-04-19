import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSites, createSite } from "../api.js";
import type { Site } from "@ucs/types";

export function SitesPage() {
  const qc = useQueryClient();
  const { data: sites = [], isLoading } = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createSite(name, origin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      setName("");
      setOrigin("");
      setFormErr(null);
    },
    onError: (e) => setFormErr(e instanceof Error ? e.message : "Failed to create site"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    mutation.mutate();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="page">
      <h1 className="page-title">My Sites</h1>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Register a new site</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Site name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
          <input
            type="url"
            placeholder="Allowed origin (e.g. https://myblog.com)"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
          />
          {formErr && <p className="error">{formErr}</p>}
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create"}
          </button>
        </form>
      </section>

      {isLoading ? (
        <p className="status">Loading…</p>
      ) : sites.length === 0 ? (
        <p className="status">No sites registered yet.</p>
      ) : (
        <div className="site-list">
          {sites.map((site: Site) => (
            <div key={site.id} className="card site-card">
              <div className="site-header">
                <strong>{site.name}</strong>
                <span className="origin-badge">{site.allowed_origin}</span>
              </div>
              <div className="api-key-row">
                <code className="api-key">{site.api_key}</code>
                <button
                  className="btn-copy"
                  onClick={() => copyKey(site.api_key)}
                >
                  {copied === site.api_key ? "Copied!" : "Copy API key"}
                </button>
              </div>
              <p className="site-meta">Site ID: <code>{site.id}</code></p>
              <div className="embed-snippet">
                <p className="snippet-label">Embed snippet:</p>
                <pre className="snippet-code">{`<div id="ucs-container"></div>
<script>
  window.UCSConfig = { siteId: "${site.id}" };
</script>
<script src="https://your-cdn.com/embed.js" async defer></script>`}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
