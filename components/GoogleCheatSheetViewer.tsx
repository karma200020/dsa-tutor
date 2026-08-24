"use client";

import React, { useState } from "react";
import { googleDsaProblems, googleCheatSheetReference, googleCodeTemplates } from "@/data/google-cheat-sheet-integration";

interface GoogleCheatSheetViewerProps {
  selectedCategory?: string;
}

export default function GoogleCheatSheetViewer({ selectedCategory }: GoogleCheatSheetViewerProps) {
  const [activeTab, setActiveTab] = useState<"problems" | "templates" | "reference">("problems");
  const [selectedProblem, setSelectedProblem] = useState<typeof googleDsaProblems[0] | null>(null);
  const [filterCategory, setFilterCategory] = useState(selectedCategory || "");

  const categories = [...new Set(googleDsaProblems.map(p => p.category))];
  const filteredProblems = filterCategory
    ? googleDsaProblems.filter(p => p.category === filterCategory)
    : googleDsaProblems;

  const groupedByCategory = Object.fromEntries(
    categories.map(cat => [
      cat,
      googleDsaProblems.filter(p => p.category === cat)
    ])
  );

  return (
    <div className="google-cheat-sheet-viewer" style={{ padding: "0", fontFamily: "system-ui, sans-serif", color: "#e2e8f0" }}>
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #334155", flexWrap: "wrap" }}>
        {["problems", "templates", "reference"].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); setSelectedProblem(null); }}
            style={{
              padding: "10px 20px",
              minHeight: "44px",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #6d5bff" : "none",
              background: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: activeTab === tab ? "600" : "400",
              color: activeTab === tab ? "#a78bfa" : "#94a3b8",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Problems Tab */}
      {activeTab === "problems" && (
        <div>
          {/* Category Filter */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ marginRight: "10px", fontWeight: "500", color: "#cbd5e1" }}>Filter by Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: "8px 12px",
                minHeight: "44px",
                borderRadius: "6px",
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#e2e8f0",
                fontSize: "14px",
                maxWidth: "100%"
              }}
            >
              <option value="">All Categories ({googleDsaProblems.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({groupedByCategory[cat].length})
                </option>
              ))}
            </select>
          </div>

          {/* Problems Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "15px", marginBottom: "20px" }}>
            {filteredProblems.map((problem, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedProblem(problem)}
                style={{
                  padding: "15px",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor: selectedProblem === problem ? "rgba(109, 91, 255, 0.12)" : "#1e293b",
                  borderColor: selectedProblem === problem ? "#6d5bff" : "#334155",
                }}
                onMouseEnter={(e) => {
                  if (selectedProblem !== problem) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#243044";
                    (e.currentTarget as HTMLElement).style.borderColor = "#475569";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedProblem !== problem) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#1e293b";
                    (e.currentTarget as HTMLElement).style.borderColor = "#334155";
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: "0", fontSize: "16px", color: "#f1f5f9", minWidth: 0, overflowWrap: "anywhere" }}>
                    {problem.title}
                  </h3>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    borderRadius: "3px",
                    flexShrink: 0,
                    backgroundColor: problem.difficulty === "Easy" ? "rgba(52, 211, 153, 0.18)" : problem.difficulty === "Medium" ? "rgba(251, 191, 36, 0.18)" : "rgba(248, 113, 113, 0.18)",
                    color: problem.difficulty === "Easy" ? "#6ee7b7" : problem.difficulty === "Medium" ? "#fcd34d" : "#fca5a5",
                  }}>
                    {problem.difficulty}
                  </span>
                </div>
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#94a3b8" }}>
                  {problem.description}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", backgroundColor: "rgba(109, 91, 255, 0.18)", color: "#c7c1ff", padding: "2px 8px", borderRadius: "3px" }}>
                    {problem.pattern}
                  </span>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {problem.leetcodeId}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Problem Details */}
          {selectedProblem && (
            <div style={{
              padding: "20px",
              backgroundColor: "#1e293b",
              borderRadius: "8px",
              border: "1px solid #334155",
              marginTop: "20px"
            }}>
              <h2 style={{ marginTop: "0", color: "#f1f5f9", overflowWrap: "anywhere" }}>{selectedProblem.title}</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "15px", marginBottom: "20px" }}>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "#94a3b8" }}>Pattern</h4>
                  <p style={{ margin: "0", fontWeight: "500", color: "#e2e8f0" }}>{selectedProblem.pattern}</p>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "#94a3b8" }}>Time Complexity</h4>
                  <p style={{ margin: "0", fontWeight: "500", fontFamily: "monospace", color: "#e2e8f0" }}>{selectedProblem.timeComplexity}</p>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "#94a3b8" }}>Space Complexity</h4>
                  <p style={{ margin: "0", fontWeight: "500", fontFamily: "monospace", color: "#e2e8f0" }}>{selectedProblem.spaceComplexity}</p>
                </div>
              </div>

              <h4 style={{ color: "#f1f5f9" }}>Key Insights</h4>
              <ul style={{ margin: "10px 0", paddingLeft: "20px", color: "#cbd5e1" }}>
                {selectedProblem.keyInsights.map((insight, idx) => (
                  <li key={idx} style={{ marginBottom: "8px", lineHeight: "1.6" }}>{insight}</li>
                ))}
              </ul>

              <h4 style={{ color: "#f1f5f9" }}>Common Mistakes to Avoid</h4>
              <ul style={{ margin: "10px 0", paddingLeft: "20px" }}>
                {selectedProblem.commonMistakes.map((mistake, idx) => (
                  <li key={idx} style={{ marginBottom: "8px", lineHeight: "1.6", color: "#fca5a5" }}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Code Templates Tab */}
      {activeTab === "templates" && (
        <div>
          <div style={{ marginBottom: "20px", backgroundColor: "rgba(251, 191, 36, 0.12)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(252, 211, 77, 0.4)" }}>
            <p style={{ margin: "0", fontSize: "14px", color: "#fcd34d" }}>
              📌 <strong>Master these templates</strong> - they appear in 80%+ of interview problems. Practice writing them without reference.
            </p>
          </div>

          <div style={{ display: "grid", gap: "20px" }}>
            {Object.entries(googleCodeTemplates).map(([name, template]) => (
              <div key={name} style={{
                padding: "15px",
                border: "1px solid #334155",
                borderRadius: "8px",
                backgroundColor: "#1e293b",
                minWidth: 0
              }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#f1f5f9" }}>
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <pre style={{
                  margin: "0",
                  padding: "12px",
                  backgroundColor: "#0f172a",
                  color: "#e5e7eb",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxWidth: "100%",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  fontFamily: "monospace"
                }}>
                  {template.trim()}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Tab */}
      {activeTab === "reference" && (
        <div>
          <div style={{ maxWidth: "800px", color: "#e2e8f0" }}>
            <h2 style={{ color: "#f1f5f9" }}>Cheat Sheet Overview</h2>
            
            <h3 style={{ color: "#f1f5f9" }}>Categories Covered</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "12px", marginBottom: "20px" }}>
              {googleCheatSheetReference.categories.map((cat, idx) => (
                <div key={idx} style={{
                  padding: "12px",
                  backgroundColor: "rgba(109, 91, 255, 0.1)",
                  borderRadius: "6px",
                  borderLeft: "4px solid #6d5bff"
                }}>
                  <div style={{ fontWeight: "500", color: "#e2e8f0" }}>{cat.name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                    {cat.problems} problems
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ color: "#f1f5f9" }}>11 Common Patterns</h3>
            <ul style={{ paddingLeft: "20px", color: "#cbd5e1" }}>
              {googleCheatSheetReference.commonPatterns.map((pattern, idx) => (
                <li key={idx} style={{ marginBottom: "8px", lineHeight: "1.6" }}>
                  <strong>{pattern}</strong>
                </li>
              ))}
            </ul>

            <h3 style={{ color: "#f1f5f9" }}>Interview Preparation Tips</h3>
            <ul style={{ paddingLeft: "20px", color: "#cbd5e1" }}>
              {googleCheatSheetReference.interviewTips.map((tip, idx) => (
                <li key={idx} style={{ marginBottom: "8px", lineHeight: "1.6" }}>
                  {tip}
                </li>
              ))}
            </ul>

            <div style={{
              marginTop: "30px",
              padding: "15px",
              backgroundColor: "rgba(109, 91, 255, 0.1)",
              borderRadius: "8px",
              borderLeft: "4px solid #6d5bff"
            }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#f1f5f9" }}>📊 Coverage Statistics</h4>
              <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#cbd5e1" }}>
                <div>Total Problems: <strong>{googleDsaProblems.length}+</strong></div>
                <div>Difficulty: Easy (4) → Medium (10) → Hard (8)</div>
                <div>Domains: Arrays, Trees, Graphs, DP, Advanced Algorithms</div>
                <div>Pattern Coverage: ~95% of typical FAANG interviews</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
