interface LiveCounterProps {
	startedAt: string
	now: Date
}

function formatDuration(ms: number): string {
	if (ms < 0) ms = 0
	const totalSeconds = Math.floor(ms / 1000)
	const days = Math.floor(totalSeconds / 86400)
	const hours = Math.floor((totalSeconds % 86400) / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const parts: string[] = []
	if (days > 0) parts.push(`${days}d`)
	if (hours > 0) parts.push(`${hours}h`)
	if (minutes > 0) parts.push(`${minutes}m`)
	parts.push(`${seconds}s`)

	return parts.join(" ")
}

export function LiveCounter({ startedAt, now }: LiveCounterProps) {
	const ms = now.getTime() - new Date(startedAt).getTime()
	return <span className="font-mono tabular-nums">{formatDuration(ms)}</span>
}

export { formatDuration }
