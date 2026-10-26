const fs = require('fs');

// Generate an SVG for the purple-and-gold, blockchain-themed certificate background
function generateCertificateBackgroundSvg(width = 2000, height = 1414) {
  // SVG definition
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Gradients -->
    <linearGradient id="outerPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E0538"/>
      <stop offset="25%" stop-color="#2D0B4E"/>
      <stop offset="50%" stop-color="#3B0764"/>
      <stop offset="75%" stop-color="#2D0B4E"/>
      <stop offset="100%" stop-color="#170326"/>
    </linearGradient>

    <linearGradient id="goldLinear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C5A059"/>
      <stop offset="25%" stop-color="#F5D77F"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="75%" stop-color="#F9E29B"/>
      <stop offset="100%" stop-color="#A67C1E"/>
    </linearGradient>

    <linearGradient id="goldH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B8860B"/>
      <stop offset="20%" stop-color="#D4AF37"/>
      <stop offset="50%" stop-color="#FFF2A1"/>
      <stop offset="80%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#996515"/>
    </linearGradient>

    <linearGradient id="bannerPurple" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#230438"/>
      <stop offset="50%" stop-color="#350654"/>
      <stop offset="100%" stop-color="#1A022B"/>
    </linearGradient>

    <!-- Cube Gradients -->
    <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4C1D95"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </linearGradient>
    <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2E1065"/>
      <stop offset="100%" stop-color="#3B0764"/>
    </linearGradient>
    <linearGradient id="cubeRight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E0741"/>
      <stop offset="100%" stop-color="#280547"/>
    </linearGradient>

    <radialGradient id="cubeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#6366F1" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#3B0764" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="1"/>
      <stop offset="40%" stop-color="#818CF8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="nodeGlowPurple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F43F5E" stop-opacity="1"/>
      <stop offset="50%" stop-color="#C084FC" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>

    <!-- Filters -->
    <filter id="goldShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- 1. Background Layers -->
  <!-- Outer deep purple base -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#outerPurple)"/>

  <!-- Outer gold perimeter border -->
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="8" fill="none" stroke="url(#goldLinear)" stroke-width="3"/>
  <rect x="25" y="25" width="${width - 50}" height="${height - 50}" rx="6" fill="none" stroke="#6B21A8" stroke-width="1.5" stroke-opacity="0.6"/>

  <!-- Central pristine ivory/white canvas area -->
  <!-- Shaped with soft arched / framed borders leaving purple margins -->
  <path d="
    M 80 80
    C 160 50, width-160 50, ${width - 80} 80
    C ${width - 50} 180, ${width - 50} ${height - 180}, ${width - 80} ${height - 80}
    C ${width - 160} ${height - 50}, 160 ${height - 50}, 80 ${height - 80}
    C 50 ${height - 180}, 50 180, 80 80 Z"
    fill="#FCFCF9"/>
  <!-- Pure central clean card -->
  <rect x="52" y="42" width="${width - 104}" height="${height - 84}" rx="16" fill="#FFFFFF" fill-opacity="0.96"/>

  <!-- Inner Double Gold Frame -->
  <rect x="62" y="52" width="${width - 124}" height="${height - 104}" rx="12" fill="none" stroke="url(#goldLinear)" stroke-width="3.5" filter="url(#goldShadow)"/>
  <rect x="74" y="64" width="${width - 148}" height="${height - 128}" rx="8" fill="none" stroke="url(#goldLinear)" stroke-width="1.5"/>

  <!-- Corner Ornamental Brackets / Ribbons -->
  <!-- Top-Left -->
  <g transform="translate(62, 52)">
    <path d="M 0 0 L 85 0 C 60 15, 20 50, 0 85 Z" fill="#2E0854"/>
    <path d="M 0 0 L 70 0 C 50 12, 16 42, 0 70 Z" fill="url(#goldLinear)"/>
    <path d="M 0 0 L 50 0 C 35 10, 12 32, 0 50 Z" fill="#3B0764"/>
    <circle cx="28" cy="28" r="4.5" fill="url(#goldLinear)"/>
    <path d="M 28 14 L 31 25 L 42 28 L 31 31 L 28 42 L 25 31 L 14 28 L 25 25 Z" fill="url(#goldLinear)"/>
  </g>

  <!-- Top-Right -->
  <g transform="translate(${width - 62}, 52) scale(-1, 1)">
    <path d="M 0 0 L 85 0 C 60 15, 20 50, 0 85 Z" fill="#2E0854"/>
    <path d="M 0 0 L 70 0 C 50 12, 16 42, 0 70 Z" fill="url(#goldLinear)"/>
    <path d="M 0 0 L 50 0 C 35 10, 12 32, 0 50 Z" fill="#3B0764"/>
    <circle cx="28" cy="28" r="4.5" fill="url(#goldLinear)"/>
    <path d="M 28 14 L 31 25 L 42 28 L 31 31 L 28 42 L 25 31 L 14 28 L 25 25 Z" fill="url(#goldLinear)"/>
  </g>

  <!-- Bottom-Left -->
  <g transform="translate(62, ${height - 52}) scale(1, -1)">
    <path d="M 0 0 L 85 0 C 60 15, 20 50, 0 85 Z" fill="#2E0854"/>
    <path d="M 0 0 L 70 0 C 50 12, 16 42, 0 70 Z" fill="url(#goldLinear)"/>
    <path d="M 0 0 L 50 0 C 35 10, 12 32, 0 50 Z" fill="#3B0764"/>
    <circle cx="28" cy="28" r="4.5" fill="url(#goldLinear)"/>
    <path d="M 28 14 L 31 25 L 42 28 L 31 31 L 28 42 L 25 31 L 14 28 L 25 25 Z" fill="url(#goldLinear)"/>
  </g>

  <!-- Bottom-Right -->
  <g transform="translate(${width - 62}, ${height - 52}) scale(-1, -1)">
    <path d="M 0 0 L 85 0 C 60 15, 20 50, 0 85 Z" fill="#2E0854"/>
    <path d="M 0 0 L 70 0 C 50 12, 16 42, 0 70 Z" fill="url(#goldLinear)"/>
    <path d="M 0 0 L 50 0 C 35 10, 12 32, 0 50 Z" fill="#3B0764"/>
    <circle cx="28" cy="28" r="4.5" fill="url(#goldLinear)"/>
    <path d="M 28 14 L 31 25 L 42 28 L 31 31 L 28 42 L 25 31 L 14 28 L 25 25 Z" fill="url(#goldLinear)"/>
  </g>

  <!-- Corner Flourish Brackets (Antique Gold Filigree inside double borders) -->
  <g stroke="url(#goldLinear)" stroke-width="2" fill="none" opacity="0.85">
    <!-- TL corner bracket -->
    <path d="M 85 105 C 105 105, 105 85, 125 85"/>
    <path d="M 105 85 C 105 105, 85 105, 85 125"/>
    <!-- TR corner bracket -->
    <path d="M ${width - 85} 105 C ${width - 105} 105, ${width - 105} 85, ${width - 125} 85"/>
    <path d="M ${width - 105} 85 C ${width - 105} 105, ${width - 85} 105, ${width - 85} 125"/>
    <!-- BL corner bracket -->
    <path d="M 85 ${height - 105} C 105 ${height - 105}, 105 ${height - 85}, 125 ${height - 85}"/>
    <path d="M 105 ${height - 85} C 105 ${height - 105}, 85 ${height - 105}, 85 ${height - 125}"/>
    <!-- BR corner bracket -->
    <path d="M ${width - 85} ${height - 105} C ${width - 105} ${height - 105}, ${width - 105} ${height - 85}, ${width - 125} ${height - 85}"/>
    <path d="M ${width - 105} ${height - 85} C ${width - 105} ${height - 105}, ${width - 85} ${height - 105}, ${width - 85} ${height - 125}"/>
  </g>

  <!-- 2. BLOCKCHAIN THEME GRAPHICS (LEFT & RIGHT OUTER EDGES) -->
  <!-- Left Side Constellation & 3D Glowing Cubes -->
  <g id="leftBlockchainGraphics">
    <!-- Connecting network lines -->
    <g stroke="#9333EA" stroke-width="1.2" stroke-opacity="0.35" stroke-dasharray="3,3">
      <line x1="85" y1="320" x2="160" y2="450"/>
      <line x1="160" y1="450" x2="280" y2="460"/>
      <line x1="280" y1="460" x2="140" y2="580"/>
      <line x1="160" y1="450" x2="140" y2="580"/>
      <line x1="140" y1="580" x2="220" y2="680"/>
      <line x1="140" y1="580" x2="80" y2="720"/>
      <line x1="80" y1="720" x2="130" y2="880"/>
      <line x1="220" y1="680" x2="130" y2="880"/>
      <line x1="130" y1="880" x2="260" y2="920"/>
      <line x1="280" y1="460" x2="350" y2="520"/>
      <line x1="220" y1="680" x2="320" y2="740"/>
    </g>
    <!-- Solid accent lines -->
    <g stroke="#38BDF8" stroke-width="1.4" stroke-opacity="0.45">
      <line x1="160" y1="450" x2="220" y2="680"/>
      <line x1="140" y1="580" x2="260" y2="920"/>
      <line x1="85" y1="320" x2="280" y2="460"/>
    </g>

    <!-- Network Nodes -->
    <circle cx="85" cy="320" r="5" fill="#C084FC" filter="url(#neonGlow)"/>
    <circle cx="280" cy="460" r="8" fill="#38BDF8" filter="url(#neonGlow)"/>
    <circle cx="280" cy="460" r="4" fill="#FFFFFF"/>
    <circle cx="350" cy="520" r="4" fill="#A855F7"/>
    <circle cx="220" cy="680" r="6" fill="#F43F5E" filter="url(#neonGlow)"/>
    <circle cx="220" cy="680" r="3" fill="#FFFFFF"/>
    <circle cx="320" cy="740" r="4.5" fill="#38BDF8"/>
    <circle cx="260" cy="920" r="6" fill="#C084FC" filter="url(#neonGlow)"/>

    <!-- Large 3D Glowing Cube (Left, Center Y: 450) -->
    <!-- Position: (160, 450), Radius: 65 -->
    <g transform="translate(160, 450)">
      <!-- Back glow halo -->
      <circle cx="0" cy="0" r="85" fill="url(#cubeGlow)"/>
      <!-- Top Face -->
      <path d="M 0 -60 L 52 -30 L 0 0 L -52 -30 Z" fill="url(#cubeTop)" stroke="#38BDF8" stroke-width="2"/>
      <!-- Left Face -->
      <path d="M -52 -30 L 0 0 L 0 60 L -52 30 Z" fill="url(#cubeLeft)" stroke="#818CF8" stroke-width="2"/>
      <!-- Right Face -->
      <path d="M 0 0 L 52 -30 L 52 30 L 0 60 Z" fill="url(#cubeRight)" stroke="#C084FC" stroke-width="2"/>
      <!-- Glowing Core Center -->
      <circle cx="0" cy="0" r="14" fill="#00E5FF" filter="url(#neonGlow)" opacity="0.9"/>
      <circle cx="0" cy="0" r="7" fill="#FFFFFF"/>
      <!-- Corner Vertices -->
      <circle cx="0" cy="-60" r="3.5" fill="#38BDF8"/>
      <circle cx="52" cy="-30" r="3.5" fill="#38BDF8"/>
      <circle cx="-52" cy="-30" r="3.5" fill="#38BDF8"/>
      <circle cx="52" cy="30" r="3.5" fill="#818CF8"/>
      <circle cx="-52" cy="30" r="3.5" fill="#818CF8"/>
      <circle cx="0" cy="60" r="3.5" fill="#C084FC"/>
    </g>

    <!-- Medium 3D Glowing Cube (Left, Lower Y: 600) -->
    <!-- Position: (130, 600), Radius: 50 -->
    <g transform="translate(130, 600)">
      <circle cx="0" cy="0" r="65" fill="url(#cubeGlow)"/>
      <path d="M 0 -45 L 39 -22.5 L 0 0 L -39 -22.5 Z" fill="url(#cubeTop)" stroke="#F43F5E" stroke-width="1.8"/>
      <path d="M -39 -22.5 L 0 0 L 0 45 L -39 22.5 Z" fill="url(#cubeLeft)" stroke="#C084FC" stroke-width="1.8"/>
      <path d="M 0 0 L 39 -22.5 L 39 22.5 L 0 45 Z" fill="url(#cubeRight)" stroke="#818CF8" stroke-width="1.8"/>
      <circle cx="0" cy="0" r="10" fill="#E879F9" filter="url(#neonGlow)" opacity="0.9"/>
      <circle cx="0" cy="0" r="4.5" fill="#FFFFFF"/>
    </g>

    <!-- Small Floating Cube (Left, Y: 730) -->
    <g transform="translate(80, 730)">
      <circle cx="0" cy="0" r="40" fill="url(#cubeGlow)"/>
      <path d="M 0 -26 L 22.5 -13 L 0 0 L -22.5 -13 Z" fill="url(#cubeTop)" stroke="#38BDF8" stroke-width="1.5"/>
      <path d="M -22.5 -13 L 0 0 L 0 26 L -22.5 13 Z" fill="url(#cubeLeft)" stroke="#818CF8" stroke-width="1.5"/>
      <path d="M 0 0 L 22.5 -13 L 22.5 13 L 0 26 Z" fill="url(#cubeRight)" stroke="#C084FC" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="6" fill="#38BDF8" filter="url(#neonGlow)"/>
    </g>
  </g>

  <!-- Right Side Constellation & 3D Glowing Cubes -->
  <g id="rightBlockchainGraphics">
    <!-- Connecting network lines -->
    <g stroke="#9333EA" stroke-width="1.2" stroke-opacity="0.35" stroke-dasharray="3,3">
      <line x1="${width - 85}" y1="320" x2="${width - 160}" y2="450"/>
      <line x1="${width - 160}" y1="450" x2="${width - 280}" y2="460"/>
      <line x1="${width - 280}" y1="460" x2="${width - 140}" y2="580"/>
      <line x1="${width - 160}" y1="450" x2="${width - 140}" y2="580"/>
      <line x1="${width - 140}" y1="580" x2="${width - 220}" y2="680"/>
      <line x1="${width - 140}" y1="580" x2="${width - 80}" y2="720"/>
      <line x1="${width - 80}" y1="720" x2="${width - 130}" y2="880"/>
      <line x1="${width - 220}" y1="680" x2="${width - 130}" y2="880"/>
      <line x1="${width - 130}" y1="880" x2="${width - 260}" y2="920"/>
      <line x1="${width - 280}" y1="460" x2="${width - 350}" y2="520"/>
      <line x1="${width - 220}" y1="680" x2="${width - 320}" y2="740"/>
    </g>
    <!-- Solid accent lines -->
    <g stroke="#38BDF8" stroke-width="1.4" stroke-opacity="0.45">
      <line x1="${width - 160}" y1="450" x2="${width - 220}" y2="680"/>
      <line x1="${width - 140}" y1="580" x2="${width - 260}" y2="920"/>
      <line x1="${width - 85}" y1="320" x2="${width - 280}" y2="460"/>
    </g>

    <!-- Network Nodes -->
    <circle cx="${width - 85}" cy="320" r="5" fill="#C084FC" filter="url(#neonGlow)"/>
    <circle cx="${width - 280}" cy="460" r="8" fill="#38BDF8" filter="url(#neonGlow)"/>
    <circle cx="${width - 280}" cy="460" r="4" fill="#FFFFFF"/>
    <circle cx="${width - 350}" cy="520" r="4" fill="#A855F7"/>
    <circle cx="${width - 220}" cy="680" r="6" fill="#F43F5E" filter="url(#neonGlow)"/>
    <circle cx="${width - 220}" cy="680" r="3" fill="#FFFFFF"/>
    <circle cx="${width - 320}" cy="740" r="4.5" fill="#38BDF8"/>
    <circle cx="${width - 260}" cy="920" r="6" fill="#C084FC" filter="url(#neonGlow)"/>

    <!-- Large 3D Glowing Cube (Right, Center Y: 490) -->
    <g transform="translate(${width - 150}, 490)">
      <circle cx="0" cy="0" r="85" fill="url(#cubeGlow)"/>
      <path d="M 0 -60 L 52 -30 L 0 0 L -52 -30 Z" fill="url(#cubeTop)" stroke="#38BDF8" stroke-width="2"/>
      <path d="M -52 -30 L 0 0 L 0 60 L -52 30 Z" fill="url(#cubeLeft)" stroke="#818CF8" stroke-width="2"/>
      <path d="M 0 0 L 52 -30 L 52 30 L 0 60 Z" fill="url(#cubeRight)" stroke="#C084FC" stroke-width="2"/>
      <circle cx="0" cy="0" r="14" fill="#00E5FF" filter="url(#neonGlow)" opacity="0.9"/>
      <circle cx="0" cy="0" r="7" fill="#FFFFFF"/>
      <circle cx="0" cy="-60" r="3.5" fill="#38BDF8"/>
      <circle cx="52" cy="-30" r="3.5" fill="#38BDF8"/>
      <circle cx="-52" cy="-30" r="3.5" fill="#38BDF8"/>
      <circle cx="52" cy="30" r="3.5" fill="#818CF8"/>
      <circle cx="-52" cy="30" r="3.5" fill="#818CF8"/>
      <circle cx="0" cy="60" r="3.5" fill="#C084FC"/>
    </g>

    <!-- Medium 3D Glowing Cube (Right, Upper Y: 350) -->
    <g transform="translate(${width - 270}, 350)">
      <circle cx="0" cy="0" r="55" fill="url(#cubeGlow)"/>
      <path d="M 0 -36 L 31 -18 L 0 0 L -31 -18 Z" fill="url(#cubeTop)" stroke="#F43F5E" stroke-width="1.8"/>
      <path d="M -31 -18 L 0 0 L 0 36 L -31 18 Z" fill="url(#cubeLeft)" stroke="#C084FC" stroke-width="1.8"/>
      <path d="M 0 0 L 31 -18 L 31 18 L 0 36 Z" fill="url(#cubeRight)" stroke="#818CF8" stroke-width="1.8"/>
      <circle cx="0" cy="0" r="8" fill="#E879F9" filter="url(#neonGlow)" opacity="0.9"/>
      <circle cx="0" cy="0" r="3.5" fill="#FFFFFF"/>
    </g>

    <!-- Medium 3D Glowing Cube (Right, Lower Y: 680) -->
    <g transform="translate(${width - 110}, 680)">
      <circle cx="0" cy="0" r="60" fill="url(#cubeGlow)"/>
      <path d="M 0 -42 L 36 -21 L 0 0 L -36 -21 Z" fill="url(#cubeTop)" stroke="#38BDF8" stroke-width="1.8"/>
      <path d="M -36 -21 L 0 0 L 0 42 L -36 21 Z" fill="url(#cubeLeft)" stroke="#818CF8" stroke-width="1.8"/>
      <path d="M 0 0 L 36 -21 L 36 21 L 0 42 Z" fill="url(#cubeRight)" stroke="#C084FC" stroke-width="1.8"/>
      <circle cx="0" cy="0" r="9" fill="#00E5FF" filter="url(#neonGlow)"/>
      <circle cx="0" cy="0" r="4" fill="#FFFFFF"/>
    </g>
  </g>

  <!-- 3. HEADER ARCHITECTURAL DIVIDERS -->
  <!-- Left Header Vertical Gold Divider -->
  <g transform="translate(480, 80)">
    <line x1="0" y1="0" x2="0" y2="150" stroke="url(#goldLinear)" stroke-width="2.5"/>
    <line x1="4" y1="15" x2="4" y2="135" stroke="url(#goldLinear)" stroke-width="1" opacity="0.7"/>
    <path d="M 0 -6 L 4 0 L 0 6 L -4 0 Z" fill="url(#goldLinear)"/>
    <path d="M 0 144 L 4 150 L 0 156 L -4 150 Z" fill="url(#goldLinear)"/>
  </g>

  <!-- Right Header Vertical Gold Divider -->
  <g transform="translate(${width - 480}, 80)">
    <line x1="0" y1="0" x2="0" y2="150" stroke="url(#goldLinear)" stroke-width="2.5"/>
    <line x1="-4" y1="15" x2="-4" y2="135" stroke="url(#goldLinear)" stroke-width="1" opacity="0.7"/>
    <path d="M 0 -6 L 4 0 L 0 6 L -4 0 Z" fill="url(#goldLinear)"/>
    <path d="M 0 144 L 4 150 L 0 156 L -4 150 Z" fill="url(#goldLinear)"/>
  </g>

  <!-- 4. ORNAMENTAL TITLE BANNER (PURPLE & GOLD) -->
  <!-- Center: X = 1000, Y = 280, Width: 1180, Height: 90 -->
  <g transform="translate(${width / 2}, 280)" filter="url(#goldShadow)">
    <!-- Outer Gold Scalloped Plaque Border -->
    <path d="
      M -570 0
      L -550 -44
      L -520 -44
      Q -500 -40 -480 -44
      L 480 -44
      Q 500 -40 520 -44
      L 550 -44
      L 570 0
      L 550 44
      L 520 44
      Q 500 40 480 44
      L -480 44
      Q -500 40 -520 44
      L -550 44
      Z"
      fill="url(#goldH)" stroke="#78350F" stroke-width="1.5"/>

    <!-- Inner Purple Plaque Body -->
    <path d="
      M -562 0
      L -544 -38
      L 544 -38
      L 562 0
      L 544 38
      L -544 38
      Z"
      fill="url(#bannerPurple)"/>

    <!-- Inner Fine Gold Inset Line -->
    <path d="
      M -554 0
      L -538 -32
      L 538 -32
      L 554 0
      L 538 32
      L -538 32
      Z"
      fill="none" stroke="url(#goldLinear)" stroke-width="1.8"/>

    <!-- Top Center Ornamental Crest Flourish -->
    <g transform="translate(0, -44)">
      <path d="M -30 0 C -15 -14, 0 -22, 0 -22 C 0 -22, 15 -14, 30 0 Z" fill="url(#goldLinear)"/>
      <circle cx="0" cy="-14" r="5" fill="#FFF2A1"/>
      <path d="M 0 -22 L 3 -16 L 8 -16 L 4 -12 L 6 -6 L 0 -10 L -6 -6 L -4 -12 L -8 -16 L -3 -16 Z" fill="#996515"/>
    </g>

    <!-- Bottom Center Ornamental Drop Flourish -->
    <g transform="translate(0, 44) scale(1, -1)">
      <path d="M -30 0 C -15 -14, 0 -22, 0 -22 C 0 -22, 15 -14, 30 0 Z" fill="url(#goldLinear)"/>
      <circle cx="0" cy="-14" r="4" fill="#FFF2A1"/>
    </g>
  </g>

  <!-- 5. STUDENT NAME UNDERLINE GOLD ACCENT & DIAMOND -->
  <!-- Centered at X = 1000, Y = 580 -->
  <g transform="translate(${width / 2}, 580)">
    <line x1="-320" y1="0" x2="-25" y2="0" stroke="url(#goldLinear)" stroke-width="2"/>
    <line x1="25" y1="0" x2="320" y2="0" stroke="url(#goldLinear)" stroke-width="2"/>
    <!-- Diamond Cluster Center -->
    <path d="M 0 -9 L 9 0 L 0 9 L -9 0 Z" fill="url(#goldLinear)"/>
    <circle cx="0" cy="0" r="3.5" fill="#2E0854"/>
    <circle cx="-16" cy="0" r="2.5" fill="url(#goldLinear)"/>
    <circle cx="16" cy="0" r="2.5" fill="url(#goldLinear)"/>
  </g>

  <!-- 6. SIGNATURE HORIZONTAL BASELINE GUIDES (FOR 4 EQUAL SIGNATORIES) -->
  <!-- Centers: cx1 = 430, cx2 = 810, cx3 = 1190, cx4 = 1570 at Y = 1120 -->
  <g stroke="url(#goldLinear)" stroke-width="1.8" opacity="0.85">
    <line x1="330" y1="1120" x2="530" y2="1120"/>
    <line x1="710" y1="1120" x2="910" y2="1120"/>
    <line x1="1090" y1="1120" x2="1290" y2="1120"/>
    <line x1="1470" y1="1120" x2="1670" y2="1120"/>
  </g>

  <!-- 7. FOOTER CERTIFICATE ID ORNAMENTAL LINES -->
  <!-- Centered at X = 1000, Y = 1290 -->
  <g transform="translate(${width / 2}, 1290)">
    <line x1="-280" y1="0" x2="-140" y2="0" stroke="url(#goldLinear)" stroke-width="1.5"/>
    <path d="M -140 -5 L -135 0 L -140 5 L -145 0 Z" fill="url(#goldLinear)"/>
    <line x1="140" y1="0" x2="280" y2="0" stroke="url(#goldLinear)" stroke-width="1.5"/>
    <path d="M 140 -5 L 145 0 L 140 5 L 135 0 Z" fill="url(#goldLinear)"/>
  </g>
</svg>`;
}

const svg = generateCertificateBackgroundSvg(2000, 1414);
fs.writeFileSync('frontend/certificate_background.svg', svg, 'utf8');
console.log('✅ Generated frontend/certificate_background.svg, byte length:', svg.length);
