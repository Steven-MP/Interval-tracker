import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	useDroppable,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
} from "@dnd-kit/core"
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
	arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { Navbar } from "@/components/layout/Navbar"
import { LiveCounter } from "@/components/shared/LiveCounter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/lib/auth/auth-context"
import { RiAddLine, RiTimeLine, RiDraggable, RiArrowDownSLine, RiDeleteBinLine } from "@remixicon/react"

export const Route = createFileRoute("/")({
	component: HomePage,
})

export interface ItemWithInterval {
	item: {
		_id: Id<"items">
		name: string
		userId: string
		groupId?: Id<"groups">
		createdAt: string
	}
	activeInterval: {
		_id: Id<"intervals">
		startedAt: string
		endedAt?: string
	} | null
}

// ─── localStorage helpers ──────────────────────────────────────────────────

function goKey(userId: string) {
	return `it-go-${userId}`
}
function ioKey(groupId: string) {
	return `it-io-${groupId}`
}
function colKey(userId: string) {
	return `it-col-${userId}`
}

function readJson<T>(key: string, fallback: T): T {
	try {
		const s = localStorage.getItem(key)
		return s ? (JSON.parse(s) as T) : fallback
	} catch {
		return fallback
	}
}

function writeJson(key: string, value: unknown) {
	localStorage.setItem(key, JSON.stringify(value))
}

export function applyOrder<T extends { _id: string }>(items: T[], savedIds: string[]): T[] {
	const map = new Map(items.map((i) => [i._id, i]))
	const ordered = savedIds.flatMap((id) => { const v = map.get(id); return v ? [v] : [] })
	const rest = items.filter((i) => !savedIds.includes(i._id))
	return [...ordered, ...rest]
}

export function applyItemOrder(items: ItemWithInterval[], savedIds: string[]): ItemWithInterval[] {
	const map = new Map(items.map((i) => [i.item._id as string, i]))
	const ordered = savedIds.flatMap((id) => { const v = map.get(id); return v ? [v] : [] })
	const rest = items.filter((i) => !savedIds.includes(i.item._id as string))
	return [...ordered, ...rest]
}

// ─── SortableItemCard ──────────────────────────────────────────────────────

interface SortableItemCardProps {
	id: string
	item: ItemWithInterval["item"]
	activeInterval: ItemWithInterval["activeInterval"]
	now: Date
}

function SortableItemCard({ id, item, activeInterval, now }: SortableItemCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
		data: { type: "item" },
	})

	return (
		<div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
			<Card className="hover:bg-accent/50 transition-colors px-6 py-4">
				<div className="flex items-center gap-3 min-w-0">
					<button
						type="button"
						className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
						{...attributes}
						{...listeners}
					>
						<RiDraggable className="size-4" />
					</button>
					<Link
						to="/$itemId"
						params={{ itemId: item._id }}
						className="flex items-center justify-between gap-3 flex-1 min-w-0"
					>
						<CardTitle className="truncate">{item.name}</CardTitle>
						{activeInterval && (
							<CardDescription className="shrink-0 font-mono tabular-nums">
								<LiveCounter startedAt={activeInterval.startedAt} now={now} />
							</CardDescription>
						)}
					</Link>
				</div>
			</Card>
		</div>
	)
}

// ─── DroppableItemList ─────────────────────────────────────────────────────

function DroppableItemList({ groupId, children, isEmpty }: { groupId: string; children: React.ReactNode; isEmpty?: boolean }) {
	const { setNodeRef, isOver } = useDroppable({ id: `drop-${groupId}` })

	return (
		<div
			ref={setNodeRef}
			className={`space-y-2 transition-colors rounded-lg ${isEmpty ? "min-h-10 flex items-center justify-center" : "min-h-1"} ${isOver ? "bg-accent/20" : ""}`}
		>
			{isEmpty ? (
				<p className="text-xs text-muted-foreground/40 select-none">Drag items here</p>
			) : (
				children
			)}
		</div>
	)
}

// ─── SortableGroup ─────────────────────────────────────────────────────────

interface SortableGroupProps {
	group: { _id: Id<"groups">; name: string }
	items: ItemWithInterval[]
	now: Date
	isCollapsed: boolean
	onToggleCollapse: () => void
	onDelete: (groupId: Id<"groups">) => void
}

function SortableGroup({ group, items, now, isCollapsed, onToggleCollapse, onDelete }: SortableGroupProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `group-${group._id}`,
		data: { type: "group" },
	})

	const itemIds = items.map((i) => i.item._id)

	return (
		<div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
			<div className="flex items-center gap-1">
				<button
					type="button"
					className="shrink-0 p-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
					{...attributes}
					{...listeners}
				>
					<RiDraggable className="size-4" />
				</button>
				<button
					type="button"
					onClick={onToggleCollapse}
					className="flex items-center gap-1 flex-1 text-sm font-semibold text-foreground hover:text-foreground/70 transition-colors py-1 text-left"
				>
					<RiArrowDownSLine
						className={`size-4 shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
					/>
					<span className="truncate">{group.name}</span>
					<span className="ml-1 text-xs text-muted-foreground font-normal shrink-0">({items.length})</span>
				</button>
				<button
					type="button"
					onClick={() => onDelete(group._id)}
					className="shrink-0 p-1 text-muted-foreground/30 hover:text-destructive transition-colors"
				>
					<RiDeleteBinLine className="size-3.5" />
				</button>
			</div>

			{!isCollapsed && (
				<div className="mt-2 ml-6">
					<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
						<DroppableItemList groupId={group._id} isEmpty={items.length === 0}>
							{items.map(({ item, activeInterval }) => (
								<SortableItemCard
									key={item._id}
									id={item._id}
									item={item}
									activeInterval={activeInterval}
									now={now}
								/>
							))}
						</DroppableItemList>
					</SortableContext>
				</div>
			)}
		</div>
	)
}

// ─── HomePage ──────────────────────────────────────────────────────────────

function HomePage() {
	const { user } = useAuth()

	const rawItems = useQuery(api.items.list)
	const rawGroups = useQuery(api.groups.list)
	const activeIntervals = useQuery(api.intervals.listActiveByUser)

	const createItem = useMutation(api.items.create)
	const createGroup = useMutation(api.groups.create)
	const removeGroup = useMutation(api.groups.remove)
	const updateItemGroup = useMutation(api.items.updateGroup)

	const isLoadingItems = rawItems === undefined || rawGroups === undefined || activeIntervals === undefined

	const [orderedGroupIds, setOrderedGroupIds] = useState<string[]>([])
	const [orderedItemIds, setOrderedItemIds] = useState<Record<string, string[]>>({})
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

	const [newItemName, setNewItemName] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [now, setNow] = useState(new Date())
	const [activeId, setActiveId] = useState<string | null>(null)
	const [activeType, setActiveType] = useState<"group" | "item" | null>(null)
	const [newGroupName, setNewGroupName] = useState("")
	const [isAddingGroup, setIsAddingGroup] = useState(false)
	const [isCreatingGroup, setIsCreatingGroup] = useState(false)

	const activeTypeRef = useRef<"group" | "item" | null>(null)
	const dragSourceGroupRef = useRef<string>("ungrouped")

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])

	// Load saved order from localStorage when data first arrives
	useEffect(() => {
		if (!user || rawGroups === undefined) return
		setOrderedGroupIds(readJson<string[]>(goKey(user.id), []))
		setCollapsed(new Set(readJson<string[]>(colKey(user.id), [])))
	}, [user, rawGroups !== undefined])

	useEffect(() => {
		if (rawItems === undefined) return
		const keys = new Set(rawItems.map((i) => i.groupId ?? "ungrouped"))
		const newOrders: Record<string, string[]> = {}
		for (const key of keys) {
			newOrders[key] = readJson<string[]>(ioKey(key), [])
		}
		newOrders.ungrouped = readJson<string[]>(ioKey("ungrouped"), [])
		setOrderedItemIds(newOrders)
	}, [rawItems !== undefined])

	// Build ordered groups
	const orderedGroups = useMemo(() => {
		if (!rawGroups) return []
		return applyOrder(rawGroups, orderedGroupIds)
	}, [rawGroups, orderedGroupIds])

	// Build groupedItems with active intervals
	const groupedItems = useMemo(() => {
		if (!rawItems || !activeIntervals) return { ungrouped: [] } as Record<string, ItemWithInterval[]>

		const activeMap = new Map(activeIntervals.map((i) => [i.itemId, i]))

		const withIntervals: ItemWithInterval[] = rawItems.map((item) => ({
			item,
			activeInterval: activeMap.get(item._id) ?? null,
		}))

		const result: Record<string, ItemWithInterval[]> = { ungrouped: [] }
		for (const g of orderedGroups) {
			result[g._id] = []
		}
		for (const iwi of withIntervals) {
			const gId = iwi.item.groupId ?? undefined
			if (gId && result[gId] !== undefined) {
				result[gId].push(iwi)
			} else {
				result.ungrouped.push(iwi)
			}
		}
		for (const key of Object.keys(result)) {
			const savedOrder = orderedItemIds[key] ?? []
			result[key] = applyItemOrder(result[key], savedOrder)
		}
		return result
	}, [rawItems, activeIntervals, orderedGroups, orderedItemIds])

	// Local override for drag state — we mutate groupedItems in drag handlers
	const [localGroupedItems, setLocalGroupedItems] = useState<Record<string, ItemWithInterval[]> | null>(null)
	const displayGroupedItems = localGroupedItems ?? groupedItems

	// Reset local state when server data updates
	useEffect(() => {
		setLocalGroupedItems(null)
	}, [groupedItems])

	function findItemGroupId(itemId: string, items: Record<string, ItemWithInterval[]>): string {
		for (const [groupId, arr] of Object.entries(items)) {
			if (arr.some((i) => i.item._id === itemId)) return groupId
		}
		return "ungrouped"
	}

	// ─── DnD handlers ──────────────────────────────────────────────────────

	function handleDragStart({ active }: DragStartEvent) {
		const id = active.id as string
		if (id.startsWith("group-")) {
			activeTypeRef.current = "group"
			setActiveType("group")
		} else {
			activeTypeRef.current = "item"
			setActiveType("item")
			dragSourceGroupRef.current = findItemGroupId(id, displayGroupedItems)
		}
		setActiveId(id)
	}

	function handleDragOver({ active, over }: DragOverEvent) {
		if (activeTypeRef.current !== "item" || !over) return

		const activeItemId = active.id as string
		const overId = over.id as string
		const current = localGroupedItems ?? groupedItems
		const currentGroupId = findItemGroupId(activeItemId, current)

		let targetGroupId: string
		if (overId.startsWith("drop-")) {
			targetGroupId = overId.slice(5)
		} else if (overId.startsWith("group-")) {
			return
		} else {
			targetGroupId = findItemGroupId(overId, current)
		}

		if (currentGroupId === targetGroupId) {
			const overItemIdx = current[currentGroupId]?.findIndex((i) => i.item._id === overId) ?? -1
			if (overItemIdx === -1) return
			setLocalGroupedItems((prev) => {
				const base = prev ?? groupedItems
				const items = base[currentGroupId]
				const oldIdx = items.findIndex((i) => i.item._id === activeItemId)
				if (oldIdx === -1 || oldIdx === overItemIdx) return prev
				return { ...base, [currentGroupId]: arrayMove(items, oldIdx, overItemIdx) }
			})
		} else {
			setLocalGroupedItems((prev) => {
				const base = prev ?? groupedItems
				const src = [...(base[currentGroupId] ?? [])]
				const dst = [...(base[targetGroupId] ?? [])]
				const idx = src.findIndex((i) => i.item._id === activeItemId)
				if (idx === -1) return prev
				const [moved] = src.splice(idx, 1)
				const overIdx = dst.findIndex((i) => i.item._id === overId)
				if (overIdx !== -1) {
					dst.splice(overIdx, 0, moved)
				} else {
					dst.push(moved)
				}
				return { ...base, [currentGroupId]: src, [targetGroupId]: dst }
			})
		}
	}

	async function handleDragEnd({ active, over }: DragEndEvent) {
		const id = active.id as string
		const type = activeTypeRef.current
		activeTypeRef.current = null
		setActiveId(null)
		setActiveType(null)

		if (!over || !user) return
		const overId = over.id as string
		const current = localGroupedItems ?? groupedItems

		if (type === "group") {
			setOrderedGroupIds((prev) => {
				const oldIdx = orderedGroups.findIndex((g) => `group-${g._id}` === id)
				const newIdx = orderedGroups.findIndex((g) => `group-${g._id}` === overId)
				if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev
				const next = arrayMove(orderedGroups, oldIdx, newIdx).map((g) => g._id)
				writeJson(goKey(user.id), next)
				return next
			})
		} else if (type === "item") {
			const finalGroupId = findItemGroupId(id, current)
			const sourceGroupId = dragSourceGroupRef.current
			writeJson(ioKey(finalGroupId), current[finalGroupId]?.map((i) => i.item._id) ?? [])
			if (sourceGroupId !== finalGroupId) {
				writeJson(ioKey(sourceGroupId), current[sourceGroupId]?.map((i) => i.item._id) ?? [])
				const newGroupId = finalGroupId === "ungrouped" ? undefined : finalGroupId as Id<"groups">
				try {
					await updateItemGroup({ itemId: id as Id<"items">, groupId: newGroupId })
				} catch {
					toast.error("Failed to save item group")
					setLocalGroupedItems(null)
				}
			}
		}
	}

	// ─── Create item ────────────────────────────────────────────────────────

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		if (!newItemName.trim()) return
		setIsCreating(true)
		try {
			await createItem({ name: newItemName.trim() })
			setNewItemName("")
			toast.success("Item created")
		} catch (err) {
			console.error("Create item error:", err)
			toast.error("Failed to create item")
		} finally {
			setIsCreating(false)
		}
	}

	// ─── Create group ────────────────────────────────────────────────────────

	async function handleCreateGroup(e: React.FormEvent) {
		e.preventDefault()
		if (!user || !newGroupName.trim()) return
		setIsCreatingGroup(true)
		try {
			const groupId = await createGroup({ name: newGroupName.trim() })
			setOrderedGroupIds((prev) => {
				const next = [...prev, groupId]
				writeJson(goKey(user.id), next)
				return next
			})
			setNewGroupName("")
			setIsAddingGroup(false)
			toast.success("Group created")
		} catch {
			toast.error("Failed to create group")
		} finally {
			setIsCreatingGroup(false)
		}
	}

	// ─── Delete group ────────────────────────────────────────────────────────

	async function handleDeleteGroup(groupId: Id<"groups">) {
		if (!user) return
		try {
			const itemsInGroup = groupedItems[groupId] ?? []
			await removeGroup({ groupId })
			await Promise.all(
				itemsInGroup.map(({ item }) =>
					updateItemGroup({ itemId: item._id, groupId: undefined }),
				),
			)
			setOrderedGroupIds((prev) => {
				const next = prev.filter((id) => id !== groupId)
				writeJson(goKey(user.id), next)
				return next
			})
			toast.success("Group deleted")
		} catch {
			toast.error("Failed to delete group")
		}
	}

	// ─── Toggle collapse ──────────────────────────────────────────────────────

	function toggleCollapse(groupId: string) {
		setCollapsed((prev) => {
			const next = new Set(prev)
			if (next.has(groupId)) next.delete(groupId)
			else next.add(groupId)
			if (user) writeJson(colKey(user.id), [...next])
			return next
		})
	}

	// ─── Derive overlay content ───────────────────────────────────────────────

	const activeItem =
		activeId && activeType === "item"
			? Object.values(displayGroupedItems)
					.flat()
					.find((i) => i.item._id === activeId)
			: null
	const activeGroup =
		activeId && activeType === "group" ? orderedGroups.find((g) => `group-${g._id}` === activeId) : null

	const groupIds = orderedGroups.map((g) => `group-${g._id}`)
	const ungroupedItems = displayGroupedItems.ungrouped ?? []
	const isEmpty = orderedGroups.length === 0 && Object.values(displayGroupedItems).every((arr) => arr.length === 0)

	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
				<form onSubmit={handleCreate} className="flex gap-2">
					<Input
						placeholder="New item name…"
						value={newItemName}
						onChange={(e) => setNewItemName(e.target.value)}
						disabled={isCreating}
					/>
					<Button type="submit" disabled={isCreating || !newItemName.trim()}>
						<RiAddLine className="size-4" />
						Add
					</Button>
				</form>

				<div className="flex items-center gap-3">
					<div className="flex-1 h-px bg-border" />
					<button
						type="button"
						onClick={() => {
							setIsAddingGroup(true)
							setNewGroupName("")
						}}
						className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
						title="Add group"
					>
						<RiAddLine className="size-4" />
					</button>
				</div>

				{isAddingGroup && (
					<form onSubmit={handleCreateGroup} className="flex gap-2">
						<Input
							placeholder="Group name…"
							value={newGroupName}
							onChange={(e) => setNewGroupName(e.target.value)}
							disabled={isCreatingGroup}
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Escape") setIsAddingGroup(false)
							}}
						/>
						<Button type="submit" disabled={isCreatingGroup || !newGroupName.trim()}>
							Create
						</Button>
						<Button type="button" variant="outline" onClick={() => setIsAddingGroup(false)} disabled={isCreatingGroup}>
							Cancel
						</Button>
					</form>
				)}

				{isLoadingItems ? (
					<div className="flex justify-center py-12">
						<div className="size-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
					</div>
				) : isEmpty ? (
					<div className="text-center py-12 text-muted-foreground">
						<RiTimeLine className="size-10 mx-auto mb-3 opacity-40" />
						<p>No items yet. Add one above.</p>
					</div>
				) : (
					<DndContext
						sensors={sensors}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
					>
						<div className="space-y-4">
							{orderedGroups.length > 0 && (
								<SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
									<div className="space-y-4">
										{orderedGroups.map((group) => (
											<SortableGroup
												key={group._id}
												group={group}
												items={displayGroupedItems[group._id] ?? []}
												now={now}
												isCollapsed={collapsed.has(group._id)}
												onToggleCollapse={() => toggleCollapse(group._id)}
												onDelete={handleDeleteGroup}
											/>
										))}
									</div>
								</SortableContext>
							)}

							{ungroupedItems.length > 0 && (
								<>
									{orderedGroups.length > 0 && (
										<p className="text-xs text-muted-foreground/50 font-medium uppercase tracking-wider">Ungrouped</p>
									)}
									<SortableContext
										items={ungroupedItems.map((i) => i.item._id)}
										strategy={verticalListSortingStrategy}
									>
										<DroppableItemList groupId="ungrouped">
											{ungroupedItems.map(({ item, activeInterval }) => (
												<SortableItemCard
													key={item._id}
													id={item._id}
													item={item}
													activeInterval={activeInterval}
													now={now}
												/>
											))}
										</DroppableItemList>
									</SortableContext>
								</>
							)}
						</div>

						<DragOverlay>
							{activeItem && (
								<Card className="px-6 py-4 shadow-lg">
									<div className="flex items-center gap-3 min-w-0">
										<span className="shrink-0 text-muted-foreground/50">
											<RiDraggable className="size-4" />
										</span>
										<div className="flex items-center justify-between gap-3 flex-1 min-w-0">
											<CardTitle className="truncate">{activeItem.item.name}</CardTitle>
											{activeItem.activeInterval && (
												<CardDescription className="shrink-0 font-mono tabular-nums">
													<LiveCounter startedAt={activeItem.activeInterval.startedAt} now={now} />
												</CardDescription>
											)}
										</div>
									</div>
								</Card>
							)}
							{activeGroup && (
								<div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
									<RiDraggable className="size-4 text-muted-foreground/50" />
									<span className="text-sm font-semibold">{activeGroup.name}</span>
								</div>
							)}
						</DragOverlay>
					</DndContext>
				)}
			</main>
		</div>
	)
}
