interface Props {
  className?: string
  size?: number
  /** 'dark' = blanco sobre fondo oscuro | 'light' = negro sobre fondo claro */
  variant?: 'dark' | 'light'
}

/**
 * Logo SVG del sello oficial — Grupo Lechero San Antonio
 * Replica el sello circular con la vaca Holstein, tipografía curva y lema.
 */
export function LogoSA({ className, size = 80, variant = 'dark' }: Props) {
  const color = variant === 'dark' ? '#ffffff' : '#1e3a5f'
  const bg    = variant === 'dark' ? 'rgba(255,255,255,0.08)' : 'transparent'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 260 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Grupo Lechero San Antonio"
      role="img"
    >
      {/* ── Fondo opcional ─────────────────────────────── */}
      <circle cx="130" cy="130" r="130" fill={bg} />

      {/* ── Anillos del sello ──────────────────────────── */}
      <circle cx="130" cy="130" r="124" stroke={color} strokeWidth="2.5" />
      <circle cx="130" cy="130" r="114" stroke={color} strokeWidth="1.2" />

      {/* ── Rutas para texto curvo ─────────────────────── */}
      <defs>
        {/* arco superior — GRUPO LECHERO */}
        <path
          id="lsa-top"
          d="M 20,130 A 110,110 0 0,1 240,130"
        />
        {/* arco inferior — lema */}
        <path
          id="lsa-bot"
          d="M 34,168 A 110,110 0 0,0 226,168"
        />
      </defs>

      {/* ── GRUPO LECHERO (curvo superior) ─────────────── */}
      <text
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="13"
        fontWeight="400"
        letterSpacing="5"
        fill={color}
      >
        <textPath href="#lsa-top" startOffset="14%">
          GRUPO LECHERO
        </textPath>
      </text>

      {/* ── CUERPO DE LA VACA ──────────────────────────── */}

      {/* Cuerpo principal */}
      <ellipse cx="124" cy="112" rx="56" ry="29" fill={color} />

      {/* Cuello */}
      <path
        d="M 168,95 Q 176,87 183,90 L 181,112 Q 172,116 162,118"
        fill={color}
      />

      {/* Cabeza */}
      <ellipse cx="192" cy="95" rx="20" ry="17" fill={color} />

      {/* Hocico / Morro */}
      <ellipse cx="208" cy="101" rx="9" ry="7" fill={variant === 'dark' ? '#1e3a5f' : '#ffffff'} />
      <ellipse cx="208" cy="101" rx="9" ry="7" stroke={color} strokeWidth="1" fill="none" />
      {/* Ventanas nasales */}
      <circle cx="205" cy="102" r="1.8" fill={color} />
      <circle cx="211" cy="102" r="1.8" fill={color} />

      {/* Ojo */}
      <circle cx="193" cy="89" r="3" fill={variant === 'dark' ? '#1e3a5f' : '#ffffff'} />
      <circle cx="193" cy="89" r="3" stroke={color} strokeWidth="0.8" />
      <circle cx="193" cy="89" r="1.2" fill={color} />

      {/* Oreja */}
      <path
        d="M 200,82 Q 208,74 207,84 Q 202,88 198,85 Z"
        fill={color}
      />

      {/* Cuerno */}
      <path
        d="M 198,81 Q 207,68 214,74"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Patas traseras */}
      <rect x="82"  y="136" width="11" height="30" rx="4" fill={color} />
      <rect x="97"  y="136" width="11" height="30" rx="4" fill={color} />
      {/* Patas delanteras */}
      <rect x="152" y="136" width="11" height="30" rx="4" fill={color} />
      <rect x="166" y="136" width="11" height="30" rx="4" fill={color} />

      {/* Ubre */}
      <path
        d="M 108,138 Q 128,148 148,138 L 146,135 Q 128,144 110,135 Z"
        fill={color}
      />
      {/* Tetas */}
      <rect x="113" y="143" width="5" height="10" rx="2.5" fill={color} />
      <rect x="123" y="145" width="5" height="10" rx="2.5" fill={color} />
      <rect x="134" y="143" width="5" height="10" rx="2.5" fill={color} />

      {/* Cola */}
      <path
        d="M 70,106 Q 52,96 47,110 Q 44,122 56,130"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Penacho de la cola */}
      <ellipse
        cx="55" cy="133"
        rx="7" ry="4.5"
        transform="rotate(25,55,133)"
        fill={color}
      />

      {/* Manchas Holstein (blancas sobre cuerpo oscuro) */}
      <ellipse
        cx="105" cy="105"
        rx="14" ry="9"
        fill={variant === 'dark' ? '#1e3a5f' : '#ffffff'}
      />
      <ellipse
        cx="137" cy="110"
        rx="11" ry="7"
        fill={variant === 'dark' ? '#1e3a5f' : '#ffffff'}
      />
      <ellipse
        cx="164" cy="107"
        rx="8" ry="5.5"
        fill={variant === 'dark' ? '#1e3a5f' : '#ffffff'}
      />

      {/* Pasto / suelo */}
      <path d="M 72,165 Q 76,155 80,165" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 84,167 Q 88,157 92,167" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 158,165 Q 162,155 166,165" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 170,167 Q 174,157 178,167" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 58,162 Q 62,153 66,162" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* ── SAN ANTONIO ────────────────────────────────── */}
      <text
        x="130"
        y="188"
        textAnchor="middle"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="3.5"
        fill={color}
      >
        SAN ANTONIO
      </text>

      {/* Línea decorativa bajo "SAN ANTONIO" */}
      <line x1="90" y1="193" x2="170" y2="193" stroke={color} strokeWidth="1" />

      {/* ── Lema (curvo inferior) ──────────────────────── */}
      <text
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="8.5"
        letterSpacing="1.8"
        fill={color}
      >
        <textPath href="#lsa-bot" startOffset="4%">
          TRABAJO · ESFUERZO &amp; PROSPERIDAD
        </textPath>
      </text>
    </svg>
  )
}
