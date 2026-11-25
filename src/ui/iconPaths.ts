/** Icon drawings (R20.AC2): 24 × 24 grid, 2 px round stroke. */
export const ICONS = {
  // Header and printer
  printer:
    'M7 9V3h10v6 M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2 M7 14h10v7H7z',
  plug: 'M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4',
  unplug: 'M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4 M3 3l18 18',
  refresh:
    'M20 11a8 8 0 0 0-14.9-3 M4 4v4h4 M4 13a8 8 0 0 0 14.9 3 M20 20v-4h-4',
  roll: 'M8 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10z M8 11.5v1 M8 7h12v10H8',
  stop: 'M6 6h12v12H6z',
  check: 'M5 12l5 5 9-10',
  warning: 'M12 3l10 18H2z M12 10v5 M12 18h.01',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 11v6 M12 7.5h.01',
  select: 'M4 4l6 16 2.5-6.5L19 11z M14 14l6 6',
  close: 'M6 6l12 12 M18 6L6 18',
  // Labels
  new: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 11v6 M9 14h6',
  open: 'M3 18V6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2 M3 18l3-8h15l-3 8z',
  save: 'M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M7 3v5h8V3 M7 21v-7h10v7',
  saveAs:
    'M11 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l3 3 M7 3v5h7 M7 21v-6h5 M14 21l.8-3.2 5.7-5.7 2.4 2.4-5.7 5.7z',
  import: 'M4 15v4h16v-4 M12 15V4 M8 8l4-4 4 4',
  export: 'M4 15v4h16v-4 M12 4v11 M8 11l4 4 4-4',
  exportPng:
    'M13 19H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6 M3 15l4-4 5 5 M14 9h.01 M19 15v6 M16 18l3 3 3-3',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  // Add
  text: 'M5 7V4h14v3 M12 4v16 M9 20h6',
  rect: 'M5 5h14v14H5z',
  ellipse: 'M12 6c4.4 0 8 2.7 8 6s-3.6 6-8 6-8-2.7-8-6 3.6-6 8-6z',
  line: 'M5 19L19 5',
  qr: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 18h2v2h-2z M14 20h2 M20 14v2',
  barcode: 'M4 5v14 M7 5v14 M10 5v14 M14 5v14 M17 5v14 M20 5v14',
  image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9h.01',
  // Edit
  undo: 'M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3',
  duplicate: 'M8 8h12v12H8z M16 8V4H4v12h4',
  toFront: 'M8 7l4-4 4 4 M12 3v8 M4 14l8 4 8-4 M4 18l8 4 8-4',
  forward: 'M8 10l4-4 4 4 M4 15l8 4 8-4',
  backward: 'M8 6l4 4 4-4 M4 15l8 4 8-4',
  toBack: 'M8 7l4 4 4-4 M12 3v8 M4 14l8 4 8-4 M4 18l8 4 8-4',
  alignLeft: 'M4 3v18 M8 6h12v4H8z M8 14h7v4H8z',
  alignCentre: 'M12 3v3 M12 10v4 M12 18v3 M6 6h12v4H6z M8 14h8v4H8z',
  alignRight: 'M20 3v18 M4 6h12v4H4z M9 14h7v4H9z',
  alignTop: 'M3 4h18 M6 8h4v12H6z M14 8h4v7h-4z',
  alignMiddle: 'M3 12h3 M10 12h4 M18 12h3 M6 6h4v12H6z M14 8h4v8h-4z',
  alignBottom: 'M3 20h18 M6 4h4v12H6z M14 9h4v7h-4z',
  zoomIn: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14z M20 20l-4-4 M8 11h6 M11 8v6',
  zoomOut: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14z M20 20l-4-4 M8 11h6',
  actualSize: 'M5 9l2-2v11 M16 9l2-2v11 M11.5 10h.01 M11.5 15h.01',
  fit: 'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',
  // Phone panels
  labels:
    'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  add: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  ruler: 'M3 8h18v8H3z M7 8v3 M11 8v4 M15 8v3 M19 8v4',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17l9 5 9-5',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  properties:
    'M4 6h10 M18 6h2 M16 4v4 M4 12h4 M12 12h8 M10 10v4 M4 18h10 M18 18h2 M16 16v4',
} as const

export type IconName = keyof typeof ICONS
