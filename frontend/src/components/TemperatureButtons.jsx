import { COLORS, TYPE, SPACE, RADIUS, TEMPERATURE_COLORS } from "../constants/theme.js";

const OPTIONS = [
  { value: "cold", label: "Cold" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
];

// Tap #1 of "three taps": one of exactly three buttons, no typing, no
// scrolling through a dropdown - that's the whole point of a field
// capture tool a salesperson uses standing in a shop doorway.
export default function TemperatureButtons({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: SPACE.sm }}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        const color = TEMPERATURE_COLORS[opt.value];
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: "56px",
              borderRadius: RADIUS,
              border: `2px solid ${color}`,
              background: active ? color : "transparent",
              color: active ? COLORS.textOnAccent : color,
              ...TYPE.title,
              fontSize: "16px",
              fontFamily: TYPE.body.fontFamily,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
