export const lerp = (from, to, t) => {
  return from + (to - from) * t
}

// Moves `current` toward `target` with the same feel at any frame rate. `delta` is in seconds.
export const damp =(current, target, speed, delta) => {
  return lerp(current, target, 1 - Math.exp(-speed * delta))
}