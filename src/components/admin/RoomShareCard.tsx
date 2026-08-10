"use client";

import { useEffect, useState } from "react";
import { FO, GameButton } from "@/components/cyan";
import { USE_MOCK } from "@/services/api";

/**
 * Share chrome for an admin-created room: large code, copy link, QR.
 * Extracted from the former public HostShareScreen.
 */
export function RoomShareCard({
  accessCode,
  joinPathPrefix = "/join/",
}: {
  accessCode: string;
  /** Path before the code, e.g. /join/ */
  joinPathPrefix?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setOrigin(window.location.origin);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const joinUrl =
    accessCode && origin
      ? `${origin}${joinPathPrefix}${encodeURIComponent(accessCode)}`
      : accessCode
        ? `${joinPathPrefix}${accessCode}`
        : "";

  const qrSrc =
    accessCode &&
    `https://api.qrserver.com/v1/create-qr-code/?size=168x168&margin=8&data=${encodeURIComponent(
      joinUrl || accessCode,
    )}`;

  const copyCode = async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
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
    <div className="text-center">
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
            textAlign: "left",
            lineHeight: 1.4,
          }}
        >
          Mock mode: this code only works in <strong>this browser</strong>. For players
          on other devices, set{" "}
          <code style={{ fontSize: 11 }}>NEXT_PUBLIC_USE_MOCK=false</code> and use a
          single-node live deploy with persistent storage.
        </p>
      )}

      <div
        style={{
          fontFamily: FO,
          fontWeight: 800,
          fontSize: "clamp(2rem, 8vw, 2.75rem)",
          letterSpacing: "0.2em",
          color: "var(--sv-teal-mid)",
          padding: "24px 16px",
          borderRadius: 16,
          border: "2px solid var(--sv-teal-mid)",
          background: "var(--sv-cyan-tint)",
          marginBottom: 12,
          userSelect: "all",
          lineHeight: 1.1,
        }}
        aria-label={`Room code ${accessCode}`}
      >
        {accessCode}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <GameButton size="md" style={{ flex: 1 }} onClick={() => void copyCode()}>
          {copied ? "Copied!" : "Copy code"}
        </GameButton>
        <GameButton
          size="md"
          variant="secondary"
          style={{ flex: 1 }}
          onClick={() => void copyLink()}
          disabled={!joinUrl}
        >
          {linkCopied ? "Link copied!" : "Copy join link"}
        </GameButton>
      </div>

      {joinUrl && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 12,
            color: "var(--sv-text-muted)",
            marginBottom: 16,
            wordBreak: "break-all",
          }}
        >
          {joinUrl}
        </p>
      )}

      {qrSrc && (
        <div
          className="mx-auto mb-2 p-3 rounded-2xl inline-block"
          style={{
            border: "1.5px solid var(--sv-border)",
            background: "white",
          }}
        >
          {/* External QR image — classroom share; no new npm dep */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code for room ${accessCode}`}
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
    </div>
  );
}
