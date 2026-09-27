import { COLORS, FONTS, RADIUS } from "../../constants/theme.js";

const base = {
  fontFamily: FONTS.body,
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: RADIUS,
  padding: "12px 18px",
  cursor: "pointer",
  border: "none",
  minHeight: "44px", // real tap target for a field app used one-handed outdoors
};

export function PrimaryButton({ children, style, disabled, ...rest }) {
  return (
    <button
      style={{ ...base, background: COLORS.ledgerGreen, color: COLORS.textOnAccent, opacity: disabled ? 0.6 : 1, ...style }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, style, disabled, ...rest }) {
  return (
    <button
      style={{ ...base, background: "none", color: COLORS.ink, border: `1.5px solid ${COLORS.border}`, opacity: disabled ? 0.6 : 1, ...style }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, style, disabled, ...rest }) {
  return (
    <button
      style={{ ...base, background: COLORS.correction, color: COLORS.textOnAccent, opacity: disabled ? 0.6 : 1, ...style }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
