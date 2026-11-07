/* Small authored SVG stand-ins. Replace these functions with approved item and
   character art later without changing the Gear, Bag, or Fight screen markup. */
const gearShapes = {
  Weapon: '<path d="M47 10l12 12-27 28-9-9z"/><path d="M19 41l12 12-7 7-12-12z"/><path d="M43 15l11 11" class="art-detail"/>',
  "Off-hand": '<path d="M36 10l22 9v16c0 12-9 21-22 28-13-7-22-16-22-28V19z"/><path d="M36 18v36m-13-25l13 8 13-8" class="art-detail"/>',
  Helm: '<path d="M14 43V31a22 22 0 0 1 44 0v16H44l-8-7-8 7H14z"/><path d="M15 35h42M22 22l7 10m21-10l-7 10m-7-7v9" class="art-detail"/>',
  Chest: '<path d="M25 12l11 5 11-5 12 9-7 16-5-4v24H25V33l-5 4-7-16z"/><path d="M36 18v36m-8-29l8 7 8-7m-15 14h15" class="art-detail"/>',
  Gloves: '<path d="M21 55l-5-19 4-4 6 9-4-23a4 4 0 0 1 8-1l4 14-1-18a4 4 0 0 1 8 0l1 17 2-13a4 4 0 0 1 8 1l-2 22-8 15z"/><path d="M25 47h23m-18-11l9 2m-8-8l9 1" class="art-detail"/>',
  Belt: '<path d="M12 25h48v22H12z"/><path d="M31 29h12v14H31z" class="art-detail"/><path d="M18 31v10m36-10v10" class="art-detail"/>',
  Legs: '<path d="M22 12h28l-3 19 8 25H40l-7-18-5 18H14l7-26z"/><path d="M22 17h27M33 34l8-3m-19 22h10m9 0h12" class="art-detail"/>',
  Boots: '<path d="M18 13h15l2 25 14 7 7 12H13v-9l10-7z"/><path d="M23 44l13-5m-18 13h34m-21-34h12" class="art-detail"/>',
  "Ring 1": '<ellipse cx="36" cy="38" rx="17" ry="20"/><path d="M29 17l7-7 7 7-7 8z"/><path d="M25 47h22" class="art-detail"/>',
  "Ring 2": '<ellipse cx="36" cy="38" rx="17" ry="20"/><path d="M36 10l7 9-7 9-7-9z"/><path d="M25 47h22" class="art-detail"/>',
  Amulet: '<path d="M24 12c0 11 4 17 12 22 8-5 12-11 12-22" fill="none"/><path d="M36 33l12 12-12 16-12-16z"/><path d="M36 38v17m-7-10h14" class="art-detail"/>'
};

let nextArtworkId = 0;
const artworkSlot = slot => slot === "Ring" ? "Ring 1" : slot;

export function gearIllustration(slot, size = "small", label = "") {
  const canonicalSlot = artworkSlot(slot);
  const shape = gearShapes[canonicalSlot] || gearShapes.Weapon;
  const accessibleLabel = label || `${slot} placeholder artwork`;
  const paintId = `metal-${nextArtworkId++}`;
  return `<svg class="gear-art gear-art-${size}" viewBox="0 0 72 72" role="img" aria-label="${accessibleLabel}" data-art-slot="${canonicalSlot}">
    <defs><linearGradient id="${paintId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d5c7b0"/><stop offset=".55" stop-color="#938a83"/><stop offset="1" stop-color="#514a4b"/></linearGradient></defs>
    <rect class="art-frame" x="2" y="2" width="68" height="68" rx="8"/>
    <g fill="url(#${paintId})" stroke="#262126" stroke-width="2.5" stroke-linejoin="round">${shape}</g>
    <g fill="none" stroke="#d6b987" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="art-detail">${shape.match(/<path[^>]+class="art-detail"[^>]*\/>/g)?.join("").replaceAll(' class="art-detail"', "") || ""}</g>
    <path class="art-stamp" d="M8 61h11"/>
  </svg>`;
}

export function combatIllustration(monsterName) {
  const foe = monsterName === "Carrion Swarm"
    ? '<g class="foe-swarm"><ellipse cx="270" cy="91" rx="27" ry="23"/><circle cx="249" cy="72" r="9"/><circle cx="285" cy="68" r="8"/><circle cx="292" cy="97" r="8"/><circle cx="253" cy="108" r="7"/><path d="M250 86l-9-7m34 2l10-9m-28 34l-8 10m31-22l12 8"/></g>'
    : monsterName === "Hollow Wisp"
      ? '<g class="foe-wisp"><path d="M270 50c-15 7-23 19-21 35 1 12 11 25 21 37 11-12 20-24 21-37 2-16-7-29-21-35z"/><ellipse cx="270" cy="82" rx="10" ry="16" class="wisp-core"/><path d="M256 110l-8 14m22-11l-1 16m14-20l8 11"/></g>'
      : '<g class="foe-husk"><path d="M250 119q-7-24 1-42l-5-17 15 8 9-19 12 20 14 7-5 43z"/><path d="M259 79l8 4m11-4l7-2M263 95l18-2" class="foe-detail"/><path d="M251 111l-14 15m46-17l14 14"/></g>';
  return `<svg class="combat-art" viewBox="0 0 360 160" role="img" aria-label="A Warrior attacks ${monsterName} — animation preview">
    <defs><linearGradient id="combat-ground" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#363037"/><stop offset="1" stop-color="#171519"/></linearGradient><radialGradient id="combat-rift"><stop stop-color="#b74350" stop-opacity=".32"/><stop offset="1" stop-color="#b74350" stop-opacity="0"/></radialGradient></defs>
    <rect width="360" height="160" fill="url(#combat-ground)"/><ellipse cx="184" cy="140" rx="167" ry="42" fill="#0b0a0c" opacity=".54"/><ellipse cx="251" cy="102" rx="95" ry="66" fill="url(#combat-rift)"/>
    <path d="M0 128q43-12 82 0t83 0 82 0 113 0M27 110l22-9m45 28l14-9m111 17l20-12m43 2l20-11" fill="none" stroke="#61544e" stroke-width="2" opacity=".45"/>
    <g class="hero-figure"><path d="M83 118l4-34 14-14 15 2 12 15-4 30z"/><path d="M95 75q-1-18 13-20 15 1 15 18l-9 8-15-1z"/><path d="M88 89l-19 17 4 7 24-13m26-4l17 7 5-7-17-14"/><path d="M94 115l-9 23m30-22l9 23"/><path d="M121 87l26-35" class="hero-sword"/><path d="M140 60l12 7m-18-4l7 11" class="hero-guard"/></g>
    ${foe}<path class="attack-slash" d="M148 72q38-29 78 2"/><circle class="impact-flare" cx="242" cy="78" r="13"/>
    <path d="M8 145h344" stroke="#8a7c71" stroke-opacity=".28"/>
  </svg>`;
}
