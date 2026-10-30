import { useEffect, useState } from 'react'

/** True on phone-sized screens. */
export const useIsMobile = () => {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  useEffect(() => {
    const q = window.matchMedia('(max-width: 860px)')
    const f = () => setM(q.matches)
    q.addEventListener('change', f)
    return () => q.removeEventListener('change', f)
  }, [])
  return m
}
