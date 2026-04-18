"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTask, type TaskActionState } from "@/actions";

export function CreateTaskButton() {
  return <CreateTaskModal />;
}

function CreateTaskModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<TaskActionState, FormData>(createTask, null);

  const open  = () => dialogRef.current?.showModal();
  const close = () => { dialogRef.current?.close(); };

  useEffect(() => {
    if (!state?.ok) return;
    const timer = setTimeout(() => close(), 1400);
    return () => clearTimeout(timer);
  }, [state?.ok]);

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
                  <><RocketIcon /> Launch Task</>
                )}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
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
