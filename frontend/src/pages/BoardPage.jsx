import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api.js";
import { getSocket } from "../lib/socket.js";
import { useViewportTier } from "../lib/useViewportTier.js";
import { COLORS, TYPE, SPACE, RADIUS, STAGES, STAGE_LABELS } from "../constants/theme.js";
import PipelineCardItem from "../components/PipelineCardItem.jsx";
import ObjectionReasonModal from "../components/ObjectionReasonModal.jsx";

export default function BoardPage() {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [pendingLostCard, setPendingLostCard] = useState(null);
  const [toast, setToast] = useState("");
  const { isDesktop } = useViewportTier();

  const refresh = useCallback(() => {
    api.getBoard().then(setBoard).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    const socket = getSocket();
    socket?.on("pipeline:card_moved", refresh);
    return () => socket?.off("pipeline:card_moved", refresh);
  }, [refresh]);

  async function moveStage(card, stage, objection_reason) {
    if (stage === "closed_lost" && !objection_reason) {
      setPendingLostCard(card);
      return;
    }
    try {
      await api.moveCardStage(card.id, stage, objection_reason);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(""), 1800);
  }

  if (error) return <div style={{ ...TYPE.body, color: COLORS.correction }}>{error}</div>;
  if (!board) return <div style={{ ...TYPE.body }}>Loading board...</div>;

  return (
    <div>
      <h1 style={{ ...TYPE.title, marginBottom: SPACE.lg }}>Pipeline</h1>

      {isDesktop ? (
        <DesktopBoard board={board} onMoveStage={moveStage} onCopyFeedback={() => showToast("Copied")} />
      ) : (
        <MobileBoard board={board} onMoveStage={moveStage} onCopyFeedback={() => showToast("Copied")} />
      )}

      {pendingLostCard && (
        <ObjectionReasonModal
          onCancel={() => setPendingLostCard(null)}
          onConfirm={(reason) => {
            moveStage(pendingLostCard, "closed_lost", reason);
            setPendingLostCard(null);
          }}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: COLORS.ink, color: COLORS.textOnAccent, padding: "8px 16px", borderRadius: RADIUS, ...TYPE.body, fontSize: "13px" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function DesktopBoard({ board, onMoveStage, onCopyFeedback }) {
  const [dragCard, setDragCard] = useState(null);

  return (
    <div style={{ display: "flex", gap: SPACE.md, overflowX: "auto", paddingBottom: SPACE.md }}>
      {STAGES.map((stage) => {
        const column = board.board[stage];
        return (
          <div
            key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragCard && dragCard.stage !== stage) onMoveStage(dragCard, stage);
              setDragCard(null);
            }}
            style={{ width: "260px", flexShrink: 0, background: COLORS.parchmentDeep, borderRadius: RADIUS, padding: SPACE.sm }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: `0 ${SPACE.xs} ${SPACE.xs}`, borderBottom: `2px solid ${COLORS.border}`, marginBottom: SPACE.sm }}>
              <span style={{ ...TYPE.label, color: COLORS.ink }}>{STAGE_LABELS[stage]} ({column.count})</span>
              {column.value > 0 && <span style={{ ...TYPE.data, fontSize: "12px" }}>₹{column.value.toLocaleString("en-IN")}</span>}
            </div>
            {column.cards.map((card) => (
              <PipelineCardItem
                key={card.id}
                card={card}
                draggable
                onDragStart={(e, c) => setDragCard(c)}
                onCopyFeedback={onCopyFeedback}
              />
            ))}
            {column.cards.length === 0 && <div style={{ ...TYPE.body, fontSize: "12px", color: COLORS.inkSoft, textAlign: "center", padding: SPACE.md }}>Empty</div>}
          </div>
        );
      })}
    </div>
  );
}

// Drag-and-drop doesn't work reliably on touch without a dedicated
// library, so phone/tablet get the same stage change through a select
// on each card instead - same capability, different input method.
function MobileBoard({ board, onMoveStage, onCopyFeedback }) {
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const column = board.board[activeStage];

  return (
    <div>
      <div style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", marginBottom: SPACE.md, paddingBottom: SPACE.xs }}>
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            style={{
              flexShrink: 0,
              ...TYPE.body,
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "8px 12px",
              borderRadius: "999px",
              border: `1.5px solid ${activeStage === stage ? COLORS.ledgerGreen : COLORS.border}`,
              background: activeStage === stage ? COLORS.ledgerGreen : "transparent",
              color: activeStage === stage ? COLORS.textOnAccent : COLORS.ink,
              cursor: "pointer",
            }}
          >
            {STAGE_LABELS[stage]} ({board.board[stage].count})
          </button>
        ))}
      </div>
      {column.value > 0 && <div style={{ ...TYPE.data, fontSize: "13px", marginBottom: SPACE.sm }}>Column total: ₹{column.value.toLocaleString("en-IN")}</div>}
      {column.cards.map((card) => (
        <PipelineCardItem key={card.id} card={card} onMoveStage={onMoveStage} onCopyFeedback={onCopyFeedback} />
      ))}
      {column.cards.length === 0 && <div style={{ ...TYPE.body, fontSize: "13px", color: COLORS.inkSoft }}>No cards in this stage.</div>}
    </div>
  );
}
