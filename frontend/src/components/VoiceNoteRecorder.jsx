import { useRef, useState } from "react";
import { COLORS, TYPE, RADIUS } from "../constants/theme.js";

// "Press-and-hold voice note" per the plan - hold to record, release to
// stop and keep it, drag away or hit Escape to cancel. Optional, so
// MediaRecorder being unsupported or mic permission being denied just
// hides the feature rather than blocking the rest of the capture.
export default function VoiceNoteRecorder({ blob, onChange }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [unsupported, setUnsupported] = useState(!navigator.mediaDevices || !window.MediaRecorder);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onChange(recordedBlob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setUnsupported(true);
      setError("Microphone access denied - you can still submit without a voice note.");
    }
  }

  function stopRecording(keep) {
    clearInterval(timerRef.current);
    setRecording(false);
    if (!keep) {
      chunksRef.current = [];
      mediaRecorderRef.current?.stream?.getTracks?.().forEach((t) => t.stop());
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (!keep) mediaRecorderRef.current.onstop = () => {}; // cancel: drop the recording
      mediaRecorderRef.current.stop();
    }
  }

  if (unsupported) {
    return blob ? (
      <div style={{ ...TYPE.body, fontSize: "12.5px", color: COLORS.inkSoft }}>Voice note attached.</div>
    ) : null;
  }

  if (blob) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: RADIUS, border: `1.5px solid ${COLORS.border}` }}>
        <span style={{ ...TYPE.body, fontSize: "13px" }}>Voice note recorded ({Math.round(blob.size / 1024)} KB)</span>
        <button onClick={() => onChange(null)} style={{ ...TYPE.body, fontSize: "12.5px", background: "none", border: "none", color: COLORS.correction, cursor: "pointer" }}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onMouseDown={startRecording}
        onMouseUp={() => stopRecording(true)}
        onMouseLeave={() => recording && stopRecording(false)}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={() => stopRecording(true)}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: RADIUS,
          border: `2px solid ${recording ? COLORS.correction : COLORS.border}`,
          background: recording ? COLORS.correction : "transparent",
          color: recording ? COLORS.textOnAccent : COLORS.ink,
          ...TYPE.body,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {recording ? `Recording... ${seconds}s (release to save)` : "Hold to record a voice note"}
      </button>
      {error && <div style={{ ...TYPE.body, fontSize: "12px", color: COLORS.correction, marginTop: "4px" }}>{error}</div>}
    </div>
  );
}
