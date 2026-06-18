/** True on phones/tablets — Site AI is desktop-Chrome only. */
export function isMobileClient (): boolean {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true
  }
  // iPadOS may report as Mac with touch
  if (navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform)) {
    return true
  }
  return false
}
