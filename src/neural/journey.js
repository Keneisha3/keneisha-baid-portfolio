/* The single source of truth for how scroll progress maps onto the walk
   through the building. Scene (3D), App (overlays), and the wall paintings
   all read these same numbers. */
export const JOURNEY = {
  split: 0.27, // the fissure: sculpture room before, the long walk after
  walkStart: 0.275,
  walkEnd: 0.87,
  stations: 11, // 6 project paintings + 5 experience paintings
};

export const walkT = (p) =>
  Math.min(1, Math.max(0, (p - JOURNEY.walkStart) / (JOURNEY.walkEnd - JOURNEY.walkStart)));

// which painting the visitor is standing in front of (or -1)
export const stationAt = (p) => {
  if (p < JOURNEY.walkStart || p > JOURNEY.walkEnd) return -1;
  return Math.min(JOURNEY.stations - 1, Math.floor(walkT(p) * JOURNEY.stations));
};
