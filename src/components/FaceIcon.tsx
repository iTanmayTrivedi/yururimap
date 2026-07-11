/** Minimal SVG face icon shared between Mood and Trip Log screens. */
export function FaceIcon({ color, kind, size = 20 }: { color: string; kind: string; size?: number }) {
  const isHappy = kind === "Happy";
  const isGood = kind === "Good";
  const isNeutral = kind === "Neutral";
  const isNotGreat = kind === "Not Great";
  const isSad = kind === "Sad";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <circle cx="9" cy="10" r="0.9" fill={color} stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill={color} stroke="none" />
      {isHappy && <path d="M8 14 Q12 18 16 14" />}
      {isGood && <path d="M8.5 14.5 Q12 17 15.5 14.5" />}
      {isNeutral && <path d="M8.5 15 H15.5" />}
      {isNotGreat && <path d="M8.5 15.5 Q12 13.5 15.5 15.5" />}
      {isSad && <path d="M8 16 Q12 12 16 16" />}
    </svg>
  );
}
