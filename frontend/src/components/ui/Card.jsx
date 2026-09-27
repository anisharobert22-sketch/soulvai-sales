import { COLORS, RADIUS, SHADOWS } from "../../constants/theme.js";

export default function Card({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS,
        boxShadow: SHADOWS.card,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
