"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { spawnAgent, type AgentActionState } from "@/actions";

const SOUL_PRESETS = [
  { label: "Relentless",  soul: "Assumes nothing works until proven. Traces every call, questions every assumption. Ships only when certain." },
  { label: "Architect",   soul: "Builds for simplicity first. Challenges complexity with a raised eyebrow. Designs what future engineers will thank." },
  { label: "Guardian",    soul: "Trusts no input. Checks every boundary, every permission, every secret. Security is the foundation." },
  { label: "Speedster",   soul: "Measures before optimising. Cares deeply about user-facing latency. Fast is a feature, not an afterthought." },
  { label: "Tester",      soul: "Coverage is safety. Every edge case deserves a name. Breaks things on purpose so production never has to." },
  { label: "Wordsmith",   soul: "Code is communication. Documentation is kindness. Writes for the engineer debugging at 2 am." },
];

export function SpawnAgentButton() {
  return <SpawnAgentModal />;
}

function SpawnAgentModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [soul, setSoul] = useState("");
  const [state, action, pending] = useActionState<AgentActionState, FormData>(spawnAgent, null);

  const open = () => dialogRef.current?.showModal();
  const close = () => { dialogRef.current?.close(); setSoul(""); };

  useEffect(() => {
    if (!state?.ok) return;
    const timer = setTimeout(() => close(), 1600);
    return () => clearTimeout(timer);
  }, [state?.ok]);

  return (
    <>
      {/* FAB — purple for agents */}
      <button
        className="fab"
        style={{ background: "var(--purple)", boxShadow: "0 4px 20px color-mix(in srgb, var(--purple) 45%, transparent)" }}
        onClick={open}
        aria-label="Spawn Agent"
      >
        <SparkleIcon />
        Commission Agent
      </button>

      <dialog ref={dialogRef} style={{ border: "none", padding: 0, background: "transparent", maxWidth: "none", width: "100%", position: "fixed", inset: 0, margin: "auto" }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="modal">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--purple)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                  Agent Registry
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Commission Agent</h2>
              </div>
              <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form action={action}>
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="agent-name">Name *</label>
                <input id="agent-name" name="name" required className="input"
                  placeholder="Atlas, Nova, Orion, Lyra…" autoFocus />
              </div>

              {/* Role */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="agent-role">Role *</label>
                <input id="agent-role" name="role" required className="input"
                  placeholder="Senior Code Reviewer, DevOps Specialist…" />
              </div>

              {/* Soul */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label className="label" htmlFor="agent-soul" style={{ marginBottom: 0 }}>Soul</label>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "var(--purple)",
                    padding: "1px 7px", borderRadius: 4,
                    background: "color-mix(in srgb, var(--purple) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--purple) 25%, transparent)",
                  }}>personality</span>
                </div>

                {/* Preset pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {SOUL_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="soul-pill"
                      onClick={() => setSoul(p.soul)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <textarea
                  id="agent-soul"
                  name="soul"
                  value={soul}
                  onChange={(e) => setSoul(e.target.value)}
                  className="input"
                  placeholder="Describe this agent's personality and approach…"
                  rows={4}
                />
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
              <button type="submit" disabled={pending} className="btn btn-purple" style={{ width: "100%" }}>
                {pending ? (
                  <><span className="spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--purple)44", borderTopColor: "var(--purple)", borderRadius: "50%" }} /> Bringing to life…</>
                ) : (
                  <><SparkleIcon /> Bring to Life</>
                )}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76 5.77 1.88-5.77 1.88L12 18.27l-1.88-5.75L4.35 10.64l5.77-1.88z" />
      <path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
    </svg>
  );
}
