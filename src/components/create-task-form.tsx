"use client";

import { useActionState, useRef, useState } from "react";
import { createTask, type TaskActionState } from "@/actions";

const PRIORITIES = [
  { key: "low",      label: "Low",      cls: "chip chip-muted" },
  { key: "medium",   label: "Medium",   cls: "chip chip-cyan" },
  { key: "high",     label: "High",     cls: "chip chip-amber" },
  { key: "critical", label: "Critical", cls: "chip chip-red" },
];

export function CreateTaskButton({ agents = [] }: { agents?: string[] }) {
  return <CreateTaskModal agents={agents} />;
}

function CreateTaskModal({ agents }: { agents: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<TaskActionState, FormData>(createTask, null);
  const [selectedAgent, setSelectedAgent] = useState("");

  const open  = () => dialogRef.current?.showModal();
  const close = () => { dialogRef.current?.close(); setSelectedAgent(""); };

  if (state?.ok) {
    setTimeout(() => close(), 1400);
  }

  return (
    <>
      <button className="fab" onClick={open} aria-label="New Task">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Task
      </button>

      <dialog ref={dialogRef} style={{
        border: "none", padding: 0, background: "transparent",
        maxWidth: "none", width: "100%",
        position: "fixed", inset: 0, margin: "auto",
      }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="modal">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                  Create Task
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Task</h2>
              </div>
              <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form action={action}>
              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="task-title">Title *</label>
                <input id="task-title" name="title" required className="input"
                  placeholder="What needs to be done?" autoFocus />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="task-desc">Description</label>
                <textarea id="task-desc" name="description" className="input"
                  placeholder="Provide context for the agent…" rows={3} />
              </div>

              {/* Agent picker */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label className="label" htmlFor="task-agent" style={{ marginBottom: 0 }}>Assign to Agent</label>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "var(--cyan)", padding: "1px 7px", borderRadius: 4,
                    background: "color-mix(in srgb, var(--cyan) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--cyan) 25%, transparent)",
                  }}>optional</span>
                </div>
                {agents.length > 0 ? (
                  <>
                    {/* Agent pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedAgent("")}
                        style={{
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                          background: selectedAgent === "" ? "color-mix(in srgb, var(--cyan) 15%, transparent)" : "var(--surface)",
                          border: `1px solid ${selectedAgent === "" ? "color-mix(in srgb, var(--cyan) 40%, transparent)" : "var(--border)"}`,
                          color: selectedAgent === "" ? "var(--cyan)" : "var(--muted)",
                          fontWeight: selectedAgent === "" ? 700 : 400,
                        }}
                      >
                        Default
                      </button>
                      {agents.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedAgent(id)}
                          style={{
                            fontFamily: "var(--font-mono)", fontSize: 11,
                            padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                            background: selectedAgent === id ? "color-mix(in srgb, var(--cyan) 15%, transparent)" : "var(--surface)",
                            border: `1px solid ${selectedAgent === id ? "color-mix(in srgb, var(--cyan) 40%, transparent)" : "var(--border)"}`,
                            color: selectedAgent === id ? "var(--cyan)" : "var(--muted)",
                            fontWeight: selectedAgent === id ? 700 : 400,
                          }}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="agentId" value={selectedAgent} />
                  </>
                ) : (
                  <input id="task-agent" name="agentId" className="input"
                    placeholder="Agent ID (leave blank for default)" />
                )}
              </div>

              {/* Priority */}
              <div style={{ marginBottom: 24 }}>
                <label className="label">Priority</label>
                <PriorityPicker />
              </div>

              {/* Feedback */}
              {state?.error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                  background: "color-mix(in srgb, var(--red) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
                    ✗ {state.error}
                  </span>
                </div>
              )}
              {state?.ok && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                  background: "color-mix(in srgb, var(--green) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>
                    ✓ {state.output}
                  </span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={pending} className="btn btn-red" style={{ width: "100%" }}>
                {pending ? (
                  <><span className="spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%" }} /> Launching…</>
                ) : (
                  <><RocketIcon /> Launch Task{selectedAgent ? ` → ${selectedAgent}` : ""}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

function PriorityPicker() {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PRIORITIES.map((p, i) => (
        <label key={p.key} style={{ cursor: "pointer" }}>
          <input type="radio" name="priority" value={p.key} defaultChecked={i === 1}
            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
            onChange={(e) => {
              const parent = e.currentTarget.closest("div");
              if (!parent) return;
              parent.querySelectorAll("[data-active]").forEach((el) => el.setAttribute("data-active", "false"));
              e.currentTarget.nextElementSibling?.setAttribute("data-active", "true");
            }}
          />
          <span className={p.cls} data-active={i === 1 ? "true" : "false"}>
            {p.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function RocketIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
