export function groupByDay(clips) {
  const groups = {}
  clips.forEach((clip) => {
    const d = new Date(clip.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(clip)
  })
  return Object.entries(groups)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, clips]) => ({ date, clips }))
}

export function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${m}월 ${d}일 ${days[date.getDay()]}`
}

export function formatTime(ts) {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}
