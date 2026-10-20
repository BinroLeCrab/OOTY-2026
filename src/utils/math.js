export const lerp = (from, to, t) => {
  return from + (to - from) * t
}

// Rapprocher `current` de `target` de fa?on ind?pendante du nombre d?images par seconde. `delta` est en secondes.
export const damp =(current, target, speed, delta) => {
  return lerp(current, target, 1 - Math.exp(-speed * delta))
}