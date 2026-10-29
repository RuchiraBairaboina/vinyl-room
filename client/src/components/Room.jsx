import { useState } from "react";

// The whole room is one SVG illustration (viewBox 1200 × 700).
// Colors come from CSS variables: --glow1/2/3 (from the album cover) and
// per-theme wall/sky/floor tokens set in styles.css via [data-theme].

const THEMES = ["morning", "dusk", "night"];
const THEME_LABEL = { morning: "morning", dusk: "dusk", night: "night" };

// Fairy-light bulbs along a sagging wire (quadratic curve).
const WIRE = { x0: 20, y0: 24, cx: 600, cy: 118, x1: 1180, y1: 24 };
const BULBS = Array.from({ length: 17 }, (_, i) => {
  const t = 0.04 + (i / 16) * 0.92;
  const u = 1 - t;
  return {
    x: u * u * WIRE.x0 + 2 * u * t * WIRE.cx + t * t * WIRE.x1,
    y: u * u * WIRE.y0 + 2 * u * t * WIRE.cy + t * t * WIRE.y1,
    color: `var(--glow${(i % 3) + 1})`,
    delay: `${(i * 0.37) % 2.4}s`,
  };
});

const SPINES = [
  { h: 74, c: "var(--glow1)" }, { h: 80, c: "#3F3A5E" }, { h: 70, c: "var(--glow2)" },
  { h: 78, c: "#FFF8F0" }, { h: 72, c: "var(--glow3)" }, { h: 80, c: "#6E6488" },
  { h: 76, c: "var(--glow1)" }, { h: 68, c: "#2E2240" }, { h: 79, c: "var(--glow2)" },
  { h: 73, c: "#F7B5C8" }, { h: 80, c: "var(--glow3)" }, { h: 75, c: "#3F3A5E" },
];

function onActivate(fn) {
  return {
    onClick: fn,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fn();
      }
    },
  };
}

export default function Room({ record, playing, onToggle, theme, onThemeChange, owner }) {
  const [hearts, setHearts] = useState([]);
  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  const petCat = () => {
    const id = Date.now() + Math.random();
    setHearts((h) => [...h.slice(-4), { id, x: (Math.random() - 0.5) * 40 }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1400);
  };

  const cover = record?.cover;
  const title = record?.title;

  return (
    <svg
      className="room"
      viewBox="0 0 1200 700"
      data-theme={theme}
      data-playing={playing ? "true" : "false"}
      role="group"
      aria-label={`${owner}'s vinyl room at ${theme}${title ? `, with ${title} on the turntable` : ""}`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--sky-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--sky-bottom)" }} />
        </linearGradient>
        <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--glow1)", stopOpacity: 0.7 }} />
          <stop offset="1" style={{ stopColor: "var(--glow1)", stopOpacity: 0 }} />
        </linearGradient>
        <radialGradient id="albumWash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: "var(--glow1)", stopOpacity: 0.9 }} />
          <stop offset="0.55" style={{ stopColor: "var(--glow2)", stopOpacity: 0.35 }} />
          <stop offset="1" style={{ stopColor: "var(--glow2)", stopOpacity: 0 }} />
        </radialGradient>
        <pattern id="wallpaper" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M28 18 l2.5 7.5 7.5 2.5 -7.5 2.5 -2.5 7.5 -2.5 -7.5 -7.5 -2.5 7.5 -2.5z" fill="var(--wall-print)" />
          <circle cx="4" cy="4" r="1.6" fill="var(--wall-print)" />
        </pattern>
        <clipPath id="labelClip">
          <circle r="54" />
        </clipPath>
        <clipPath id="posterClip">
          <rect x="551" y="196" width="98" height="98" rx="2" />
        </clipPath>
        <filter id="blur" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ---------- wall & floor ---------- */}
      <rect width="1200" height="540" fill="var(--wall)" />
      <rect width="1200" height="540" fill="url(#wallpaper)" />
      <rect y="530" width="1200" height="16" fill="var(--trim)" />
      <rect y="546" width="1200" height="154" fill="var(--floor)" />
      <g stroke="var(--floor-line)" strokeWidth="2">
        <line x1="0" y1="584" x2="1200" y2="584" />
        <line x1="0" y1="628" x2="1200" y2="628" />
        <line x1="0" y1="676" x2="1200" y2="676" />
        {[130, 470, 810, 1090].map((x) => <line key={`a${x}`} x1={x} y1="546" x2={x} y2="584" />)}
        {[300, 650, 960].map((x) => <line key={`b${x}`} x1={x} y1="584" x2={x} y2="628" />)}
        {[80, 420, 760, 1140].map((x) => <line key={`c${x}`} x1={x} y1="628" x2={x} y2="676" />)}
      </g>

      {/* rug, tinted by the album */}
      <ellipse cx="600" cy="642" rx="440" ry="46" fill="var(--glow2)" opacity="0.6" />
      <ellipse cx="600" cy="642" rx="400" ry="36" fill="none" stroke="#FFF8F0" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />

      {/* ---------- window (click to change the time of day) ---------- */}
      <g
        className="hotspot window"
        role="button"
        tabIndex={0}
        aria-label={`Change time of day. It's ${THEME_LABEL[theme]} now; next is ${THEME_LABEL[nextTheme]}.`}
        data-testid="window"
        {...onActivate(() => onThemeChange(nextTheme))}
      >
        <rect x="40" y="36" width="380" height="8" rx="4" fill="var(--wood-dark)" />
        <rect x="80" y="62" width="300" height="250" rx="12" fill="var(--trim)" />
        <rect x="96" y="78" width="268" height="218" rx="4" fill="url(#sky)" />
        <g className="sun">
          <circle cx="300" cy="150" r="44" fill="#FFF3C4" opacity="0.5" />
          <circle cx="300" cy="150" r="28" fill="#FFE59A" />
        </g>
        <g className="clouds" fill="#FFFFFF">
          <path d="M140 210 q8 -20 28 -12 q10 -18 30 -6 q18 -4 20 14 q12 4 6 16 h-86 q-10 -6 2 -12z" opacity="0.85" />
          <path d="M250 250 q6 -14 20 -8 q8 -12 22 -4 q14 -2 14 10 q8 4 4 10 h-62 q-8 -4 2 -8z" opacity="0.7" />
        </g>
        <g className="moon">
          <circle cx="292" cy="140" r="26" fill="#FFF4D6" />
          <circle cx="304" cy="132" r="22" fill="var(--sky-top)" />
        </g>
        <g className="stars" fill="#FFF4D6">
          {[[130, 110, 2], [170, 160, 1.5], [215, 100, 2.2], [150, 240, 1.4], [330, 230, 1.8], [250, 200, 1.2], [345, 100, 1.3]].map(([x, y, r]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
        <rect x="227" y="78" width="6" height="218" fill="var(--trim)" />
        <rect x="96" y="184" width="268" height="6" fill="var(--trim)" />
        <rect x="66" y="302" width="328" height="14" rx="5" fill="var(--trim)" />
        {/* little pot on the sill */}
        <path d="M300 282 h36 l-4 20 h-28z" fill="#F7B5C8" />
        <ellipse cx="310" cy="276" rx="7" ry="12" fill="#7DB592" transform="rotate(-18 310 276)" />
        <ellipse cx="326" cy="274" rx="7" ry="13" fill="#8DC5A0" transform="rotate(16 326 274)" />
        {/* curtains */}
        <path d="M52 40 h62 q-16 70 4 140 q14 70 -6 150 h-60z" fill="var(--curtain)" />
        <path d="M408 40 h-62 q16 70 -4 140 q-14 70 6 150 h60z" fill="var(--curtain)" />
        <path d="M70 40 q-6 140 4 290 M90 40 q-8 150 2 290" stroke="var(--curtain-fold)" strokeWidth="3" fill="none" />
        <path d="M390 40 q6 140 -4 290 M370 40 q8 150 -2 290" stroke="var(--curtain-fold)" strokeWidth="3" fill="none" />
      </g>

      {/* ---------- sticky note ---------- */}
      <g transform="rotate(-6 452 250)">
        <rect x="406" y="206" width="94" height="84" rx="3" fill="#FFE58F" />
        <rect x="438" y="200" width="30" height="12" fill="#FFFFFF" opacity="0.6" />
        <text x="453" y="242" className="hand" fontSize="22" textAnchor="middle" fill="var(--ink)" textLength="66" lengthAdjust="spacingAndGlyphs">tap the</text>
        <text x="453" y="268" className="hand" fontSize="22" textAnchor="middle" fill="var(--ink)" textLength="74" lengthAdjust="spacingAndGlyphs">record ♪</text>
      </g>

      {/* ---------- framed "now spinning" poster ---------- */}
      <g data-testid="poster">
        <line x1="600" y1="150" x2="560" y2="178" stroke="var(--wood-dark)" strokeWidth="2" />
        <line x1="600" y1="150" x2="640" y2="178" stroke="var(--wood-dark)" strokeWidth="2" />
        <circle cx="600" cy="150" r="4" fill="var(--wood-dark)" />
        <rect x="531" y="176" width="138" height="138" rx="6" fill="var(--walnut)" />
        <rect x="541" y="186" width="118" height="118" fill="#FFF8F0" />
        {cover ? (
          <image href={cover} x="551" y="196" width="98" height="98" preserveAspectRatio="xMidYMid slice" clipPath="url(#posterClip)" />
        ) : (
          <g>
            <rect x="551" y="196" width="98" height="98" fill="var(--glow2)" opacity="0.5" />
            <circle cx="600" cy="245" r="32" fill="#1D1A26" />
            <circle cx="600" cy="245" r="12" fill="var(--glow1)" />
          </g>
        )}
      </g>

      {/* ---------- shelf, sign & plant ---------- */}
      <g>
        <line x1="985" y1="70" x2="905" y2="104" stroke="var(--wood-dark)" strokeWidth="2" />
        <line x1="985" y1="70" x2="1065" y2="104" stroke="var(--wood-dark)" strokeWidth="2" />
        <circle cx="985" cy="70" r="4" fill="var(--wood-dark)" />
        <rect x="860" y="100" width="250" height="66" rx="16" fill="var(--walnut)" />
        <text x="985" y="144" className="hand sign" fontSize="31" fontWeight="700" textAnchor="middle" fill="#FFF8F0" textLength="214" lengthAdjust="spacingAndGlyphs">
          {owner.toLowerCase()}'s vinyl room
        </text>
      </g>
      <g>
        <rect x="870" y="292" width="240" height="12" rx="3" fill="var(--walnut)" />
        <path d="M890 304 v14 h14z M1086 304 v14 h-14z" fill="var(--wood-dark)" />
        {[[884, 46, "#B8A4EC"], [902, 54, "#3F3A5E"], [922, 42, "#F7B5C8"], [940, 50, "#9FD8C2"]].map(([x, h, c]) => (
          <rect key={x} x={x} y={292 - h} width="16" height={h} rx="2" fill={c} />
        ))}
        <rect x="962" y="254" width="16" height="44" rx="2" fill="#FFD79A" transform="rotate(14 970 292)" />
        {/* polaroid */}
        <g transform="rotate(-5 1010 268)">
          <rect x="992" y="242" width="38" height="46" fill="#FFF8F0" />
          <rect x="996" y="246" width="30" height="30" fill="var(--glow3)" />
        </g>
        {/* trailing pothos */}
        <path d="M1062 270 h34 l-4 22 h-26z" fill="#9FD8C2" />
        <g fill="#7DB592">
          <path d="M1070 292 q-12 40 -2 90" stroke="#5E9A74" strokeWidth="2.5" fill="none" />
          <path d="M1090 292 q14 50 0 120" stroke="#5E9A74" strokeWidth="2.5" fill="none" />
          {[[1062, 318], [1070, 350], [1064, 378], [1097, 326], [1094, 364], [1092, 400], [1072, 262], [1086, 258]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="8" ry="6" transform={`rotate(${i % 2 ? 30 : -30} ${x} ${y})`} />
          ))}
        </g>
      </g>

      {/* ---------- floor plant ---------- */}
      <g>
        <g fill="#7DB592">
          {[[-38, 64], [-12, 70], [16, 66], [40, 60], [-60, 52], [60, 50]].map(([a, len], i) => (
            <g key={i} transform={`translate(150 560) rotate(${a})`}>
              <path d={`M0 0 v-${len}`} stroke="#5E9A74" strokeWidth="3" />
              <ellipse cx="0" cy={-len - 26} rx="22" ry="32" fill={i % 2 ? "#8DC5A0" : "#7DB592"} />
              <path d={`M0 ${-len} v-50`} stroke="#5E9A74" strokeWidth="1.5" opacity="0.6" />
            </g>
          ))}
        </g>
        <path d="M108 548 h84 l-10 84 h-64z" fill="#F7B5C8" />
        <rect x="102" y="540" width="96" height="14" rx="5" fill="#F29CB4" />
      </g>

      {/* ---------- record sleeves leaning on the cabinet ---------- */}
      <rect x="214" y="520" width="74" height="74" rx="2" fill="var(--glow3)" transform="rotate(-8 251 594)" />
      <rect x="226" y="526" width="74" height="74" rx="2" fill="#3F3A5E" transform="rotate(-3 263 600)" />
      <circle cx="263" cy="563" r="20" fill="none" stroke="var(--glow1)" strokeWidth="4" transform="rotate(-3 263 600)" />

      {/* ---------- record cabinet ---------- */}
      <g>
        <rect x="282" y="592" width="12" height="46" rx="3" fill="var(--wood-dark)" />
        <rect x="906" y="592" width="12" height="46" rx="3" fill="var(--wood-dark)" />
        <rect x="262" y="486" width="676" height="110" rx="6" fill="var(--walnut)" />
        <rect x="250" y="470" width="700" height="18" rx="7" fill="var(--walnut-light)" />
        <g stroke="var(--wood-dark)" strokeWidth="2" opacity="0.55">
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={292 + i * 22} y1="500" x2={292 + i * 22} y2="582" />)}
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={732 + i * 22} y1="500" x2={732 + i * 22} y2="582" />)}
        </g>
        <rect x="502" y="498" width="196" height="88" rx="4" fill="var(--wood-dark)" />
        {SPINES.map((s, i) => (
          <rect key={i} x={510 + i * 15.5} y={584 - s.h} width="12" height={s.h} rx="1.5" fill={s.c} />
        ))}
        <circle cx="488" cy="541" r="4" fill="var(--wood-dark)" />
        <circle cx="712" cy="541" r="4" fill="var(--wood-dark)" />
      </g>

      {/* ---------- speakers ---------- */}
      {[272, 828].map((x) => (
        <g key={x}>
          <rect x={x} y="352" width="100" height="118" rx="14" fill="#3F3A5E" />
          <circle cx={x + 50} cy="384" r="12" fill="#2E2240" />
          <circle cx={x + 50} cy="384" r="5" fill="#57507A" />
          <g className="woofer">
            <circle cx={x + 50} cy="430" r="30" fill="#2E2240" />
            <circle cx={x + 50} cy="430" r="13" fill="#57507A" />
          </g>
        </g>
      ))}

      {/* ---------- turntable (click to play / pause) ---------- */}
      <g
        className="hotspot turntable"
        role="button"
        tabIndex={0}
        aria-pressed={playing}
        aria-label={playing ? `Pause ${title || "the record"}` : `Play ${title || "the record"}`}
        data-testid="turntable"
        {...onActivate(onToggle)}
      >
        <path d="M420 366 H780 L802 440 H398 Z" fill="#F1E3D3" />
        <rect x="398" y="440" width="404" height="30" rx="6" fill="#E2CDB6" />
        <circle className="led" cx="426" cy="455" r="5" />
        <circle cx="760" cy="455" r="7" fill="#C9B29A" />
        <circle cx="782" cy="455" r="7" fill="#C9B29A" />
        <g transform="translate(585 404) scale(1 0.23)">
          <circle r="160" fill="#C9C3D3" />
          <g className="record-spin">
            <circle r="150" fill="#1D1A26" />
            {[140, 128, 116, 104, 92, 80, 68].map((r) => (
              <circle key={r} r={r} fill="none" stroke="#383348" strokeWidth="2" />
            ))}
            {cover ? (
              <image href={cover} x="-54" y="-54" width="108" height="108" preserveAspectRatio="xMidYMid slice" clipPath="url(#labelClip)" />
            ) : (
              <g>
                <circle r="54" fill="var(--glow1)" />
                <path d="M-54 0 A54 54 0 0 1 54 0 Z" fill="var(--glow2)" />
              </g>
            )}
            <path d="M-150 0 A150 150 0 0 1 -60 -120" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="10" fill="none" />
            <circle r="5" fill="#E8E2F0" />
          </g>
        </g>
        <g className="tonearm">
          <rect x="757" y="364" width="16" height="10" rx="3" fill="#8E86A6" />
          <path d="M765 385 L757 431 L739 443" stroke="#B9B2CC" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="765" cy="385" r="13" fill="#A39BBB" />
          <circle cx="765" cy="385" r="5" fill="#E8E2F0" />
        </g>
      </g>

      {/* ---------- cat (click to pet) ---------- */}
      <g
        className="hotspot cat"
        role="button"
        tabIndex={0}
        aria-label="Pet the cat"
        data-testid="cat"
        transform="translate(1000 548)"
        {...onActivate(petCat)}
      >
        {/* invisible, generous tap area so the cat is easy to hit on phones */}
        <rect x="-60" y="-60" width="170" height="180" rx="40" fill="transparent" />
        <path className="tail" d="M36 92 C96 96 104 34 74 22" stroke="var(--fur)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <ellipse cx="0" cy="66" rx="48" ry="46" fill="var(--fur)" />
        <ellipse cx="0" cy="76" rx="27" ry="31" fill="var(--fur-light)" />
        <ellipse cx="-17" cy="108" rx="13" ry="8" fill="var(--fur-light)" />
        <ellipse cx="17" cy="108" rx="13" ry="8" fill="var(--fur-light)" />
        <g className="cat-head">
          <path d="M-36 -8 L-28 -50 L-6 -32 Z" fill="var(--fur)" />
          <path d="M36 -8 L28 -50 L6 -32 Z" fill="var(--fur)" />
          <path d="M-29 -16 L-25 -40 L-12 -30 Z" fill="#F7B5C8" />
          <path d="M29 -16 L25 -40 L12 -30 Z" fill="#F7B5C8" />
          <circle cx="0" cy="0" r="40" fill="var(--fur)" />
          <ellipse cx="-24" cy="12" rx="8" ry="5" fill="#F7B5C8" opacity="0.75" />
          <ellipse cx="24" cy="12" rx="8" ry="5" fill="#F7B5C8" opacity="0.75" />
          <g className="eyes-sleep" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M-21 0 q7 6 14 0" />
            <path d="M7 0 q7 6 14 0" />
          </g>
          <g className="eyes-happy" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M-21 3 q7 -10 14 0" />
            <path d="M7 3 q7 -10 14 0" />
          </g>
          <path d="M-4 8 h8 l-4 5 z" fill="#E68AA5" />
          <path d="M-7 15 q3.5 4 7 0 q3.5 4 7 0" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <g stroke="var(--fur-light)" strokeWidth="1.5" opacity="0.8">
            <line x1="-30" y1="10" x2="-52" y2="6" />
            <line x1="-30" y1="15" x2="-52" y2="17" />
            <line x1="30" y1="10" x2="52" y2="6" />
            <line x1="30" y1="15" x2="52" y2="17" />
          </g>
        </g>
        <g className="zzz hand" fill="var(--ink)">
          <text x="38" y="-42" fontSize="22">z</text>
          <text x="52" y="-62" fontSize="17">z</text>
        </g>
        {hearts.map((h) => (
          <text key={h.id} className="heart" x={h.x} y="-50" fontSize="26" textAnchor="middle" fill="#F27BA0">♥</text>
        ))}
      </g>

      {/* ---------- floor lamp ---------- */}
      <g>
        <ellipse cx="1132" cy="646" rx="34" ry="8" fill="var(--wood-dark)" />
        <rect x="1129" y="324" width="6" height="322" fill="var(--wood-dark)" />
        <path d="M1086 326 H1178 L1160 262 H1104 Z" fill="#FFF3DF" />
      </g>

      {/* ---------- time-of-day dimming (lights are drawn above this) ---------- */}
      <rect className="dim" width="1200" height="700" fill="var(--dim-color)" pointerEvents="none" />

      {/* ---------- lights ---------- */}
      <g pointerEvents="none">
        <ellipse className="album-wash" cx="600" cy="420" rx="520" ry="300" fill="url(#albumWash)" />
        <path className="lamp-cone" d="M1094 326 H1170 L1200 650 H1010 Z" fill="url(#lampCone)" />
        <ellipse className="lamp-halo" cx="1132" cy="300" rx="70" ry="50" fill="var(--glow1)" filter="url(#blur)" />
        <path className="lamp-shade-lit" d="M1086 326 H1178 L1160 262 H1104 Z" fill="#FFF3DF" />
        <path d={`M${WIRE.x0} ${WIRE.y0} Q${WIRE.cx} ${WIRE.cy} ${WIRE.x1} ${WIRE.y1}`} stroke="var(--wood-dark)" strokeWidth="2" fill="none" />
        {BULBS.map((b, i) => (
          <g key={i}>
            <circle className="bulb-glow" cx={b.x} cy={b.y + 12} r="15" fill={b.color} filter="url(#blur)" style={{ animationDelay: b.delay }} />
            <line x1={b.x} y1={b.y} x2={b.x} y2={b.y + 6} stroke="var(--wood-dark)" strokeWidth="2" />
            <ellipse cx={b.x} cy={b.y + 12} rx="5" ry="7" fill={b.color} />
          </g>
        ))}
        <circle className="led-glow" cx="426" cy="455" r="12" fill="var(--glow1)" filter="url(#blur)" />
        <g className="notes hand" fill="#FFF8F0">
          <text x="300" y="340" fontSize="30">♪</text>
          <text x="880" y="336" fontSize="26">♫</text>
          <text x="1040" y="470" fontSize="24">♪</text>
        </g>
      </g>
    </svg>
  );
}
