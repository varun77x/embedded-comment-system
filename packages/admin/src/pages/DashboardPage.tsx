import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSites } from "../api.js";

export function DashboardPage() {
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const totalSites = sites.length;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

      {isLoading ? (
        <p className="status">Loading…</p>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{totalSites}</span>
            <span className="stat-label">Registered site{totalSites !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
