"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FO, GameButton, cardStyle } from "@/components/cyan";
import { AdminSection } from "@/components/admin/AdminShell";
import { api, USE_MOCK } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";

/**
 * Admin-only classroom group create + share (code, join link, QR).
 * Players join from home via access code or ?code= link — they never create groups.
 */
export function AdminCreateHeat({ onCreated }: { onCreated?: () => void }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heat, setHeat] = useState<{ heat_id: string; access_code: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const inflight = useRef(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setOrigin(window.location.origin);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const create = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setCreating(true);
    setError(null);
    try {
      const result = await api.adminCreateRoom({});
      setHeat({ heat_id: result.heat_id, access_code: result.access_code });
      onCreated?.();
    } catch (e) {
      const { message } = parseApiFailure(e);
      setError(message || "Could not create group");
    } finally {
      setCreating(false);
      inflight.current = false;
    }
  }, [onCreated]);

  const joinUrl =
    heat?.access_code && origin
      ? `${origin}/?code=${encodeURIComponent(heat.access_code)}`
      : heat?.access_code
        ? `code=${heat.access_code}`
        : "";

  const qrSrc =
    heat?.access_code &&
    `https://api.qrserver.com/v1/create-qr-code/?size=168x168&margin=8&data=${encodeURIComponent(
      joinUrl || heat.access_code,
    )}`;

  const copyCode = async () => {
    if (!heat?.access_code) return;
    try {
      await navigator.clipboard.writeText(heat.access_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <AdminSection
      title="Create & share a group"
      subtitle="Players cannot create groups. Create a classroom group here, then share the code or QR."
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <GameButton
          type="button"
          size="sm"
          disabled={creating}
          onClick={() => void create()}
        >
          {creating ? "Creating…" : heat ? "Create another group" : "Create group"}
        </GameButton>
      </div>

      {USE_MOCK && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--sv-warning, #b45309)",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          Mock mode: this code only works in <strong>this browser</strong>. For classmates
          on other devices, set{" "}
          <code style={{ fontSize: 11 }}>NEXT_PUBLIC_USE_MOCK=false</code> and restart.
        </p>
      )}

      {error && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 13,
            color: "var(--sv-negative)",
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      {heat && (
        <div
          style={{
            ...cardStyle,
            padding: 20,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: FO,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--sv-text-muted)",
              marginBottom: 8,
            }}
          >
            Access code
          </p>
          <div
            style={{
              fontFamily: FO,
              fontWeight: 800,
              fontSize: "clamp(1.75rem, 6vw, 2.5rem)",
              letterSpacing: "0.2em",
              color: "var(--sv-teal-mid)",
              padding: "20px 12px",
              borderRadius: 16,
              border: "2px solid var(--sv-teal-mid)",
              background: "var(--sv-cyan-tint)",
              marginBottom: 12,
              userSelect: "all",
              lineHeight: 1.1,
            }}
            aria-label={`Group code ${heat.access_code}`}
          >
            {heat.access_code}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <GameButton type="button" size="md" style={{ flex: 1 }} onClick={() => void copyCode()}>
              {copied ? "Copied!" : "Copy code"}
            </GameButton>
            <GameButton
              type="button"
              size="md"
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => void copyLink()}
              disabled={!joinUrl}
            >
              {linkCopied ? "Link copied!" : "Copy join link"}
            </GameButton>
          </div>

          {qrSrc && (
            <div
              className="mx-auto mb-3 p-3 rounded-2xl inline-block"
              style={{
                border: "1.5px solid var(--sv-border)",
                background: "white",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR code for group ${heat.access_code}`}
                width={168}
                height={168}
                style={{ display: "block", imageRendering: "pixelated" }}
              />
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--sv-text-muted)",
                  marginTop: 8,
                  marginBottom: 0,
                }}
              >
                Scan to open join link
              </p>
            </div>
          )}

          {joinUrl && (
            <p
              style={{
                fontFamily: FO,
                fontSize: 12,
                color: "var(--sv-text-secondary)",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {joinUrl}
            </p>
          )}
        </div>
      )}
    </AdminSection>
  );
}
