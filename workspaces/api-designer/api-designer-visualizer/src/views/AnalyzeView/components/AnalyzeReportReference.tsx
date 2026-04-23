import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Issue {
  id: number;
  code: string;
  message: string;
  path: string[];
  severity: number;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}

// ── Raw data ───────────────────────────────────────────────────────────────
const RAW_ISSUES: Issue[] = [
  { id: 1, code: "owasp:api9:2023-inventory-access", message: "Declare intended audience of every server by defining servers[0].x-internal as true/false.", path: ["servers", "0"], severity: 0, range: { start: { line: 10, character: 4 }, end: { line: 11, character: 34 } } },
  { id: 2, code: "owasp:api9:2023-inventory-access", message: "Declare intended audience of every server by defining servers[1].x-internal as true/false.", path: ["servers", "1"], severity: 0, range: { start: { line: 12, character: 4 }, end: { line: 13, character: 31 } } },
  { id: 3, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].", path: ["paths", "/pizzas", "get", "responses"], severity: 1, range: { start: { line: 43, character: 16 }, end: { line: 65, character: 50 } } },
  { id: 4, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].content.", path: ["paths", "/pizzas", "get", "responses"], severity: 1, range: { start: { line: 43, character: 16 }, end: { line: 65, character: 50 } } },
  { id: 5, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].", path: ["paths", "/pizzas", "get", "responses"], severity: 1, range: { start: { line: 43, character: 16 }, end: { line: 65, character: 50 } } },
  { id: 6, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].content.", path: ["paths", "/pizzas", "get", "responses"], severity: 1, range: { start: { line: 43, character: 16 }, end: { line: 65, character: 50 } } },
  { id: 7, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].", path: ["paths", "/pizzas", "get", "responses"], severity: 1, range: { start: { line: 43, character: 16 }, end: { line: 65, character: 50 } } },
  { id: 8, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].content.", path: ["paths", "/pizzas", "get", "responses"], severity: 1, range: { start: { line: 43, character: 16 }, end: { line: 65, character: 50 } } },
  { id: 9, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].", path: ["paths", "/pizzas", "post", "responses"], severity: 1, range: { start: { line: 78, character: 16 }, end: { line: 90, character: 50 } } },
  { id: 10, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].content.", path: ["paths", "/pizzas", "post", "responses"], severity: 1, range: { start: { line: 78, character: 16 }, end: { line: 90, character: 50 } } },
  { id: 11, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].", path: ["paths", "/pizzas", "post", "responses"], severity: 1, range: { start: { line: 78, character: 16 }, end: { line: 90, character: 50 } } },
  { id: 12, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].content.", path: ["paths", "/pizzas", "post", "responses"], severity: 1, range: { start: { line: 78, character: 16 }, end: { line: 90, character: 50 } } },
  { id: 13, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].", path: ["paths", "/pizzas", "post", "responses"], severity: 1, range: { start: { line: 78, character: 16 }, end: { line: 90, character: 50 } } },
  { id: 14, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].content.", path: ["paths", "/pizzas", "post", "responses"], severity: 1, range: { start: { line: 78, character: 16 }, end: { line: 90, character: 50 } } },
  { id: 15, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 16, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].content.", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 17, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 18, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].content.", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 19, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 20, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].content.", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 21, code: "owasp:api8:2023-define-error-validation", message: "Missing error response of either 400, 422 or 4XX.", path: ["paths", "/pizzas/{pizzaId}", "get", "responses"], severity: 1, range: { start: { line: 105, character: 16 }, end: { line: 117, character: 50 } } },
  { id: 22, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 23, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].content.", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 24, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 25, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].content.", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 26, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 27, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].content.", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 28, code: "owasp:api8:2023-define-error-validation", message: "Missing error response of either 400, 422 or 4XX.", path: ["paths", "/pizzas/{pizzaId}", "put", "responses"], severity: 1, range: { start: { line: 137, character: 16 }, end: { line: 149, character: 50 } } },
  { id: 29, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
  { id: 30, code: "owasp:api4:2023-rate-limit-responses-429", message: "Operation is missing rate limiting response in responses[429].content.", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
  { id: 31, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
  { id: 32, code: "owasp:api8:2023-define-error-responses-401", message: "Operation is missing responses[401].content.", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
  { id: 33, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
  { id: 34, code: "owasp:api8:2023-define-error-responses-500", message: "Operation is missing responses[500].content.", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
  { id: 35, code: "owasp:api8:2023-define-error-validation", message: "Missing error response of either 400, 422 or 4XX.", path: ["paths", "/pizzas/{pizzaId}", "delete", "responses"], severity: 1, range: { start: { line: 163, character: 16 }, end: { line: 171, character: 50 } } },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const OWASP_MAP: Record<string, { label: string; category: string; link: string }> = {
  "api9:2023-inventory-access":      { label: "API9:2023", category: "Improper Inventory Management", link: "https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/" },
  "api4:2023-rate-limit-responses-429": { label: "API4:2023", category: "Unrestricted Resource Consumption", link: "https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/" },
  "api8:2023-define-error-responses-401": { label: "API8:2023", category: "Security Misconfiguration", link: "https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/" },
  "api8:2023-define-error-responses-500": { label: "API8:2023", category: "Security Misconfiguration", link: "https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/" },
  "api8:2023-define-error-validation":    { label: "API8:2023", category: "Security Misconfiguration", link: "https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/" },
};

const FIX_MAP: Record<string, string> = {
  "api9:2023-inventory-access": "Add  x-internal: true  or  x-internal: false  under each server entry to declare its intended audience.",
  "api4:2023-rate-limit-responses-429": "Add a 429 response with an  application/json  content schema to the operation's responses block.",
  "api8:2023-define-error-responses-401": "Add a 401 response with an  application/json  content schema (e.g. error message + code).",
  "api8:2023-define-error-responses-500": "Add a 500 response with an  application/json  content schema describing the internal error format.",
  "api8:2023-define-error-validation": "Add a 400, 422, or generic 4XX response to handle input validation errors.",
};

function getRuleKey(code: string) {
  const parts = code.split(":");
  return parts.slice(1).join(":");
}

function getOwasp(code: string) {
  const key = getRuleKey(code);
  return OWASP_MAP[key] ?? { label: "—", category: "Unknown", link: "#" };
}

function getFix(code: string) {
  const key = getRuleKey(code);
  return FIX_MAP[key] ?? "Review the rule documentation for remediation guidance.";
}

function formatPath(path: string[]) {
  if (path[0] === "paths") {
    const method = path[2]?.toUpperCase() ?? "";
    const endpoint = path[1] ?? "";
    return `${method} ${endpoint}`;
  }
  return path.join(" › ");
}

function getScore(issues: Issue[]) {
  const errors = issues.filter((i) => i.severity === 0).length;
  const warnings = issues.filter((i) => i.severity === 1).length;
  const raw = Math.max(0, 100 - errors * 15 - warnings * 2);
  return raw;
}

function getGrade(score: number) {
  if (score >= 90) return { letter: "A", color: "#22c55e" };
  if (score >= 75) return { letter: "B", color: "#84cc16" };
  if (score >= 60) return { letter: "C", color: "#f59e0b" };
  if (score >= 40) return { letter: "D", color: "#f97316" };
  return { letter: "F", color: "#ef4444" };
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#3b82f6",
  POST: "#22c55e",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
  PATCH: "#8b5cf6",
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: number }) {
  return severity === 0 ? (
    <span style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "monospace" }}>
      ERROR
    </span>
  ) : (
    <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "monospace" }}>
      WARN
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const color = METHOD_COLORS[method] ?? "#6b7280";
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em" }}>
      {method}
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${accent}44`, borderRadius: 10, padding: "18px 22px", minWidth: 140, flex: 1, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accent, borderRadius: "10px 0 0 10px" }} />
      <div style={{ fontSize: 32, fontWeight: 800, color: accent, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#374151", marginTop: 6, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SpectralReport() {
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [severityFilter, setSeverityFilter] = useState<"all" | "error" | "warning">("all");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "rule" | "endpoint">("none");
  const [sortBy, setSortBy] = useState<"severity" | "line" | "rule">("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState<"table" | "owasp" | "endpoints">("table");

  const score = getScore(RAW_ISSUES);
  const grade = getGrade(score);

  const errors = RAW_ISSUES.filter((i) => i.severity === 0);
  const warnings = RAW_ISSUES.filter((i) => i.severity === 1);

  const uniqueEndpoints = useMemo(() => {
    const s = new Set(RAW_ISSUES.map((i) => formatPath(i.path)));
    return [...s];
  }, []);

  const ruleFreq = useMemo(() => {
    const map: Record<string, number> = {};
    RAW_ISSUES.forEach((i) => { map[i.code] = (map[i.code] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);

  const endpointFreq = useMemo(() => {
    const map: Record<string, number> = {};
    RAW_ISSUES.forEach((i) => { const k = formatPath(i.path); map[k] = (map[k] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);

  const owaspCategories = useMemo(() => {
    const map: Record<string, { count: number; category: string; link: string }> = {};
    RAW_ISSUES.forEach((i) => {
      const o = getOwasp(i.code);
      if (!map[o.label]) map[o.label] = { count: 0, category: o.category, link: o.link };
      map[o.label].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, []);

  const filtered = useMemo(() => {
    let list = [...RAW_ISSUES];
    if (severityFilter === "error") list = list.filter((i) => i.severity === 0);
    if (severityFilter === "warning") list = list.filter((i) => i.severity === 1);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.code.toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q) ||
        formatPath(i.path).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "severity") cmp = a.severity - b.severity;
      else if (sortBy === "line") cmp = a.range.start.line - b.range.start.line;
      else if (sortBy === "rule") cmp = a.code.localeCompare(b.code);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [severityFilter, search, sortBy, sortDir]);

  const selected = RAW_ISSUES.find((i) => i.id === selectedId) ?? null;

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? (
      <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
    ) : (
      <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.25 }}>⇅</span>
    );

  const maxEndpointCount = endpointFreq[0]?.[1] ?? 1;
  const maxRuleCount = ruleFreq[0]?.[1] ?? 1;

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#111827" }}>
      {/* ── Top bar ── */}
      <div style={{ background: "#0f172a", color: "#f1f5f9", padding: "0 28px", display: "flex", alignItems: "center", gap: 16, height: 52, borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366f1,#06b6d4)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>Spectral</span>
          <span style={{ color: "#475569", fontSize: 14 }}>/</span>
          <span style={{ color: "#94a3b8", fontSize: 14, fontFamily: "monospace" }}>pizza-api.yaml</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#64748b", fontSize: 12 }}>Run: Apr 22, 2026 · 14:03 UTC</span>
        <div style={{ width: 1, height: 20, background: "#1e293b" }} />
        <span style={{ color: "#64748b", fontSize: 12 }}>Ruleset: OWASP API Security 2023</span>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px" }}>

        {/* ── Score + Stats row ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "stretch" }}>
          {/* Grade card */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 130 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>API Score</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: grade.color, lineHeight: 1, fontFamily: "monospace" }}>{grade.letter}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: grade.color, marginTop: 2 }}>{score}/100</div>
          </div>

          <StatCard label="Errors" value={errors.length} sub="Severity 0 · Critical" accent="#ef4444" />
          <StatCard label="Warnings" value={warnings.length} sub="Severity 1 · Advisory" accent="#f59e0b" />
          <StatCard label="Endpoints Affected" value={uniqueEndpoints.length} sub="of all defined paths" accent="#6366f1" />
          <StatCard label="OWASP Rules Violated" value={owaspCategories.length} sub="API Security Top 10" accent="#06b6d4" />
          <StatCard label="Total Issues" value={RAW_ISSUES.length} sub="across all paths" accent="#8b5cf6" />
        </div>

        {/* ── Tab nav ── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#f1f5f9", padding: 4, borderRadius: 8, width: "fit-content" }}>
          {(["table", "owasp", "endpoints"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "#fff" : "transparent", border: "none", borderRadius: 6, padding: "6px 18px", fontSize: 13, fontWeight: 600, color: activeTab === tab ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: activeTab === tab ? "0 1px 3px #0001" : "none", transition: "all 0.15s" }}>
              {tab === "table" ? "Issues Table" : tab === "owasp" ? "OWASP Breakdown" : "By Endpoint"}
            </button>
          ))}
        </div>

        {/* ── ISSUES TABLE VIEW ── */}
        {activeTab === "table" && (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Table panel */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                {(["all", "error", "warning"] as const).map((f) => {
                  const counts = { all: RAW_ISSUES.length, error: errors.length, warning: warnings.length };
                  const active = severityFilter === f;
                  return (
                    <button key={f} onClick={() => setSeverityFilter(f)} style={{ background: active ? "#0f172a" : "#fff", color: active ? "#f1f5f9" : "#374151", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
                    </button>
                  );
                })}
                <div style={{ flex: 1 }} />
                <input
                  placeholder="Search rules, paths, messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 12px", fontSize: 13, outline: "none", width: 260, background: "#fff" }}
                />
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", fontSize: 12, background: "#fff", cursor: "pointer" }}>
                  <option value="none">No grouping</option>
                  <option value="rule">Group by rule</option>
                  <option value="endpoint">Group by endpoint</option>
                </select>
              </div>

              {/* Table */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 60px 90px", gap: 0, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Severity</div>
                  <button onClick={() => toggleSort("rule")} style={{ textAlign: "left", background: "none", border: "none", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>
                    Rule <SortIcon col="rule" />
                  </button>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Path</div>
                  <button onClick={() => toggleSort("line")} style={{ textAlign: "left", background: "none", border: "none", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>
                    Line <SortIcon col="line" />
                  </button>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>OWASP</div>
                </div>

                {/* Rows */}
                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {filtered.length === 0 && (
                    <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No issues match your filter.</div>
                  )}
                  {groupBy === "none" && filtered.map((issue) => {
                    const pathStr = formatPath(issue.path);
                    const parts = pathStr.split(" ");
                    const method = parts.length > 1 ? parts[0] : "";
                    const endpoint = parts.length > 1 ? parts.slice(1).join(" ") : pathStr;
                    const owasp = getOwasp(issue.code);
                    const isSelected = selectedId === issue.id;
                    return (
                      <div key={issue.id} onClick={() => setSelectedId(issue.id)} style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 60px 90px", gap: 0, padding: "11px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: isSelected ? "#f0f9ff" : "#fff", borderLeft: isSelected ? "3px solid #6366f1" : "3px solid transparent", transition: "background 0.1s" }}>
                        <div><SeverityBadge severity={issue.severity} /></div>
                        <div>
                          <div style={{ fontSize: 12, fontFamily: "monospace", color: "#1e293b", fontWeight: 600, wordBreak: "break-all" }}>{issue.code.replace("owasp:", "")}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>{issue.message.slice(0, 72)}{issue.message.length > 72 ? "…" : ""}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          {method && <MethodBadge method={method} />}
                          <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>{endpoint}</span>
                        </div>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b" }}>L{issue.range.start.line}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>{owasp.label}</div>
                      </div>
                    );
                  })}

                  {/* Group by rule */}
                  {groupBy === "rule" && (() => {
                    const groups: Record<string, Issue[]> = {};
                    filtered.forEach((i) => { if (!groups[i.code]) groups[i.code] = []; groups[i.code].push(i); });
                    return Object.entries(groups).map(([code, items]) => (
                      <div key={code}>
                        <div style={{ background: "#f8fafc", padding: "8px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>{code.replace("owasp:", "")}</span>
                          <span style={{ background: "#e2e8f0", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 600, color: "#64748b" }}>{items.length}</span>
                        </div>
                        {items.map((issue) => {
                          const pathStr = formatPath(issue.path);
                          const parts = pathStr.split(" ");
                          const method = parts.length > 1 ? parts[0] : "";
                          const endpoint = parts.length > 1 ? parts.slice(1).join(" ") : pathStr;
                          const isSelected = selectedId === issue.id;
                          return (
                            <div key={issue.id} onClick={() => setSelectedId(issue.id)} style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 60px 90px", gap: 0, padding: "10px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: isSelected ? "#f0f9ff" : "#fff", borderLeft: isSelected ? "3px solid #6366f1" : "3px solid transparent" }}>
                              <div><SeverityBadge severity={issue.severity} /></div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{issue.message.slice(0, 80)}…</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                {method && <MethodBadge method={method} />}
                                <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>{endpoint}</span>
                              </div>
                              <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b" }}>L{issue.range.start.line}</div>
                              <div />
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}

                  {/* Group by endpoint */}
                  {groupBy === "endpoint" && (() => {
                    const groups: Record<string, Issue[]> = {};
                    filtered.forEach((i) => { const k = formatPath(i.path); if (!groups[k]) groups[k] = []; groups[k].push(i); });
                    return Object.entries(groups).map(([ep, items]) => {
                      const parts = ep.split(" ");
                      const method = parts.length > 1 ? parts[0] : "";
                      const endpoint = parts.length > 1 ? parts.slice(1).join(" ") : ep;
                      return (
                        <div key={ep}>
                          <div style={{ background: "#f8fafc", padding: "8px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                            {method && <MethodBadge method={method} />}
                            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>{endpoint}</span>
                            <span style={{ background: "#e2e8f0", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 600, color: "#64748b" }}>{items.length}</span>
                          </div>
                          {items.map((issue) => {
                            const owasp = getOwasp(issue.code);
                            const isSelected = selectedId === issue.id;
                            return (
                              <div key={issue.id} onClick={() => setSelectedId(issue.id)} style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 60px 90px", gap: 0, padding: "10px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: isSelected ? "#f0f9ff" : "#fff", borderLeft: isSelected ? "3px solid #6366f1" : "3px solid transparent" }}>
                                <div><SeverityBadge severity={issue.severity} /></div>
                                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#1e293b", fontWeight: 600 }}>{issue.code.replace("owasp:", "")}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{issue.message.slice(0, 50)}…</div>
                                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b" }}>L{issue.range.start.line}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>{owasp.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>

                <div style={{ padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#94a3b8" }}>
                  Showing {filtered.length} of {RAW_ISSUES.length} issues
                </div>
              </div>
            </div>

            {/* ── Detail panel ── */}
            <div style={{ width: 380, flexShrink: 0 }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", position: "sticky", top: 20 }}>
                <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700 }}>Issue Detail</span>
                  {selected && <span style={{ color: "#64748b", fontSize: 12 }}>#{selected.id} of {RAW_ISSUES.length}</span>}
                </div>
                {!selected ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Click any row to inspect</div>
                ) : (() => {
                  const owasp = getOwasp(selected.code);
                  const fix = getFix(selected.code);
                  const pathStr = formatPath(selected.path);
                  const parts = pathStr.split(" ");
                  const method = parts.length > 1 ? parts[0] : "";
                  const endpoint = parts.length > 1 ? parts.slice(1).join(" ") : pathStr;
                  return (
                    <div style={{ padding: 18 }}>
                      {/* Rule */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Rule</div>
                        <code style={{ fontSize: 12, background: "#f1f5f9", padding: "4px 8px", borderRadius: 4, display: "block", wordBreak: "break-all", color: "#1e293b" }}>{selected.code}</code>
                      </div>

                      {/* Severity + Line */}
                      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Severity</div>
                          <SeverityBadge severity={selected.severity} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Lines</div>
                          <code style={{ fontSize: 12, color: "#475569" }}>L{selected.range.start.line}–{selected.range.end.line}</code>
                        </div>
                      </div>

                      {/* Path */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Path</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {method && <MethodBadge method={method} />}
                          <code style={{ fontSize: 12, color: "#334155" }}>{endpoint || selected.path.join(" › ")}</code>
                        </div>
                      </div>

                      {/* Message */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Message</div>
                        <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#713f12", lineHeight: 1.6 }}>{selected.message}</div>
                      </div>

                      {/* Fix */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Fix Suggestion</div>
                        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#14532d", lineHeight: 1.6 }}>
                          <span style={{ marginRight: 6 }}>✓</span>{fix}
                        </div>
                      </div>

                      {/* OWASP */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>OWASP Reference</div>
                        <a href={owasp.link} target="_blank" rel="noreferrer" style={{ display: "block", background: "#eef2ff", border: "1px solid #a5b4fc", borderRadius: 6, padding: "10px 12px", textDecoration: "none" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{owasp.label}</div>
                          <div style={{ fontSize: 12, color: "#6366f1", marginTop: 2 }}>{owasp.category}</div>
                          <div style={{ fontSize: 11, color: "#818cf8", marginTop: 4 }}>View documentation →</div>
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── OWASP BREAKDOWN VIEW ── */}
        {activeTab === "owasp" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {owaspCategories.map(([label, { count, category, link }]) => {
              const isError = RAW_ISSUES.some((i) => i.severity === 0 && getOwasp(i.code).label === label);
              const accent = isError ? "#ef4444" : "#f59e0b";
              const pct = Math.round((count / RAW_ISSUES.length) * 100);
              return (
                <div key={label} style={{ background: "#fff", border: `1px solid ${accent}44`, borderRadius: 10, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: accent, fontFamily: "monospace" }}>{label}</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginTop: 3 }}>{category}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: accent, fontFamily: "monospace", lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>issues</div>
                    </div>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: accent, height: "100%", width: `${pct}%`, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{pct}% of total issues</span>
                    <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none" }}>Docs →</a>
                  </div>
                </div>
              );
            })}

            {/* Passing categories */}
            {[
              { label: "API1:2023", category: "Broken Object Level Authorization" },
              { label: "API2:2023", category: "Broken Authentication" },
              { label: "API3:2023", category: "Broken Object Property Level Auth" },
              { label: "API5:2023", category: "Broken Function Level Authorization" },
            ].map(({ label, category }) => (
              <div key={label} style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, background: "#22c55e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", fontFamily: "monospace" }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{category}</div>
                  <div style={{ fontSize: 11, color: "#86efac", marginTop: 2 }}>No issues found</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ENDPOINT VIEW ── */}
        {activeTab === "endpoints" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {endpointFreq.map(([ep, count]) => {
              const parts = ep.split(" ");
              const method = parts.length > 1 ? parts[0] : "";
              const endpoint = parts.length > 1 ? parts.slice(1).join(" ") : ep;
              const epIssues = RAW_ISSUES.filter((i) => formatPath(i.path) === ep);
              const epErrors = epIssues.filter((i) => i.severity === 0).length;
              const epWarns = epIssues.filter((i) => i.severity === 1).length;
              const rulesHit = [...new Set(epIssues.map((i) => i.code))];
              const barPct = Math.round((count / maxEndpointCount) * 100);

              return (
                <div key={ep} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {method && <MethodBadge method={method} />}
                    <code style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{endpoint}</code>
                    <div style={{ flex: 1 }} />
                    {epErrors > 0 && <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{epErrors} error{epErrors > 1 ? "s" : ""}</span>}
                    {epWarns > 0 && <span style={{ background: "#fef3c7", color: "#b45309", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{epWarns} warning{epWarns > 1 ? "s" : ""}</span>}
                  </div>
                  {/* Bar */}
                  <div style={{ background: "#f1f5f9", borderRadius: 4, height: 6, marginBottom: 10 }}>
                    <div style={{ background: epErrors > 0 ? "#ef4444" : "#f59e0b", height: "100%", width: `${barPct}%`, borderRadius: 4 }} />
                  </div>
                  {/* Rule chips */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {rulesHit.map((code) => (
                      <span key={code} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "monospace", color: "#475569" }}>{code.replace("owasp:", "")}</span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Rule frequency chart */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 24px", marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Rule Frequency</div>
              {ruleFreq.map(([code, count]) => {
                const key = getRuleKey(code);
                const isError = RAW_ISSUES.some((i) => i.code === code && i.severity === 0);
                const color = isError ? "#ef4444" : "#f59e0b";
                const pct = Math.round((count / maxRuleCount) * 100);
                return (
                  <div key={code} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <code style={{ fontSize: 12, color: "#334155" }}>{key}</code>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                    </div>
                    <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8 }}>
                      <div style={{ background: color, height: "100%", width: `${pct}%`, borderRadius: 4, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}