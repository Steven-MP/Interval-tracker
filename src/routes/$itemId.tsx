import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Navbar } from "@/components/layout/Navbar"
import { LiveCounter, formatDuration } from "@/components/shared/LiveCounter"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
	databases,
	DATABASE_ID,
	ITEMS_COLLECTION,
	INTERVALS_COLLECTION,
	nowISO,
} from "@/lib/appwrite/client"
import { useAuth } from "@/lib/auth/auth-context"
import { ID, Query, type Models } from "appwrite"
import { RiRestartLine, RiTimeLine, RiArrowLeftLine, RiDeleteBinLine } from "@remixicon/react"

export const Route = createFileRoute("/$itemId")({
	component: ItemDetailPage,
})

function ItemDetailPage() {
	const { itemId } = Route.useParams()
	const { user } = useAuth()
	const navigate = useNavigate()

	const [item, setItem] = useState<Models.Document | null>(null)
	const [intervals, setIntervals] = useState<Models.Document[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [now, setNow] = useState(new Date())
	const [isRestarting, setIsRestarting] = useState(false)
	const [showRestartFrom, setShowRestartFrom] = useState(false)
	const [restartFromValue, setRestartFromValue] = useState("")
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])

	const loadData = useCallback(async () => {
		if (!user) return
		try {
			const [itemDoc, intRes] = await Promise.all([
				databases.getDocument(DATABASE_ID, ITEMS_COLLECTION, itemId),
				databases.listDocuments(DATABASE_ID, INTERVALS_COLLECTION, [
					Query.equal("itemId", itemId),
					Query.equal("userId", user.$id),
					Query.limit(500),
				]),
			])
			setItem(itemDoc)
			const sorted = [...intRes.documents].sort(
				(a, b) => new Date(b.startedAt as string).getTime() - new Date(a.startedAt as string).getTime(),
			)
			setIntervals(sorted)
		} catch {
			toast.error("Failed to load item")
		} finally {
			setIsLoading(false)
		}
	}, [user, itemId])

	useEffect(() => {
		loadData()
	}, [loadData])

	const activeInterval = intervals.find((i) => !i.endedAt) ?? null
	const completedIntervals = intervals.filter((i) => i.endedAt)

	const durations = completedIntervals.map(
		(i) => new Date(i.endedAt as string).getTime() - new Date(i.startedAt as string).getTime(),
	)

	const averageDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null
	const shortestDuration = durations.length ? Math.min(...durations) : null
	const longestDuration = durations.length ? Math.max(...durations) : null

	async function doRestart(startedAt: string) {
		if (!user) return
		setIsRestarting(true)
		try {
			if (activeInterval) {
				await databases.updateDocument(DATABASE_ID, INTERVALS_COLLECTION, activeInterval.$id, {
					endedAt: nowISO(),
				})
			}
			await databases.createDocument(DATABASE_ID, INTERVALS_COLLECTION, ID.unique(), {
				itemId,
				userId: user.$id,
				startedAt,
			})
			await loadData()
			toast.success("Restarted")
		} catch {
			toast.error("Failed to restart")
		} finally {
			setIsRestarting(false)
		}
	}

	async function handleRestart() {
		await doRestart(new Date().toISOString())
	}

	async function handleRestartFrom() {
		if (!restartFromValue) return
		setShowRestartFrom(false)
		await doRestart(new Date(restartFromValue).toISOString().replace(/Z$/, "+00:00"))
	}

	async function handleDelete() {
		if (!user) return
		setIsDeleting(true)
		try {
			await Promise.all(intervals.map((i) => databases.deleteDocument(DATABASE_ID, INTERVALS_COLLECTION, i.$id)))
			await databases.deleteDocument(DATABASE_ID, ITEMS_COLLECTION, itemId)
			toast.success("Item deleted")
			navigate({ to: "/" })
		} catch {
			toast.error("Failed to delete item")
			setIsDeleting(false)
		}
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<Navbar />
				<div className="flex justify-center py-24">
					<div className="size-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
				</div>
			</div>
		)
	}

	if (!item) {
		return (
			<div className="min-h-screen bg-background">
				<Navbar />
				<div className="flex justify-center py-24 text-muted-foreground">
					Item not found.
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
				<div className="flex items-center gap-3">
					<Link to="/" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
						<RiArrowLeftLine className="size-5" />
					</Link>
					<h1 className="text-2xl font-bold flex-1 truncate">{item.name as string}</h1>
					<button
						type="button"
						onClick={() => setShowDeleteConfirm(true)}
						className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
					>
						<RiDeleteBinLine className="size-5" />
					</button>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<Card className="py-4">
						<CardContent className="text-center">
							<p className="text-3xl font-bold">{completedIntervals.length}</p>
							<p className="text-sm text-muted-foreground mt-1">Intervals</p>
						</CardContent>
					</Card>
					<Card className="py-4">
						<CardContent className="text-center">
							<p className="text-3xl font-bold font-mono">
								{averageDuration !== null ? formatDuration(averageDuration) : "—"}
							</p>
							<p className="text-sm text-muted-foreground mt-1">Average</p>
						</CardContent>
					</Card>
					<Card className="py-4">
						<CardContent className="text-center">
							<p className="text-3xl font-bold font-mono">
								{shortestDuration !== null ? formatDuration(shortestDuration) : "—"}
							</p>
							<p className="text-sm text-muted-foreground mt-1">Shortest</p>
						</CardContent>
					</Card>
					<Card className="py-4">
						<CardContent className="text-center">
							<p className="text-3xl font-bold font-mono">
								{longestDuration !== null ? formatDuration(longestDuration) : "—"}
							</p>
							<p className="text-sm text-muted-foreground mt-1">Longest</p>
						</CardContent>
					</Card>
				</div>

				{activeInterval && (
					<Card className="py-4">
						<CardHeader className="pb-0">
							<CardTitle className="text-base">Current interval</CardTitle>
							<CardDescription>
								<LiveCounter
									startedAt={activeInterval.startedAt as string}
									now={now}
								/>
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4 flex gap-2">
							<Button
								className="flex-1"
								onClick={handleRestart}
								disabled={isRestarting}
							>
								<RiRestartLine className="size-4" />
								Restart
							</Button>
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => {
									const now = new Date()
									const offset = now.getTimezoneOffset() * 60000
									const local = new Date(now.getTime() - offset)
									setRestartFromValue(local.toISOString().slice(0, 16))
									setShowRestartFrom(true)
								}}
								disabled={isRestarting}
							>
								<RiTimeLine className="size-4" />
								Restart from…
							</Button>
						</CardContent>
					</Card>
				)}

				{completedIntervals.length > 0 && (
					<div>
						<h2 className="text-sm font-medium text-muted-foreground mb-3">
							History
						</h2>
						<div className="space-y-2">
							{completedIntervals.map((interval, i) => {
								const duration =
									new Date(interval.endedAt as string).getTime() -
									new Date(interval.startedAt as string).getTime()
								return (
									<div
										key={interval.$id}
										className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card text-sm"
									>
										<span className="text-muted-foreground">
											#{completedIntervals.length - i}
										</span>
										<span className="font-mono">{formatDuration(duration)}</span>
									</div>
								)
							})}
						</div>
					</div>
				)}
			</main>

			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete item?</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						This will permanently delete{" "}
						<span className="font-medium text-foreground">{item.name as string}</span>{" "}
						and all {intervals.length} interval{intervals.length !== 1 ? "s" : ""}. This cannot be undone.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showRestartFrom} onOpenChange={setShowRestartFrom}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Restart from…</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="restart-from">Start time</Label>
						<input
							id="restart-from"
							type="datetime-local"
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							value={restartFromValue}
							onChange={(e) => setRestartFromValue(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowRestartFrom(false)}>
							Cancel
						</Button>
						<Button onClick={handleRestartFrom} disabled={!restartFromValue}>
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
