import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useEffect, useCallback, useRef } from "react"
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
import { Navbar } from "@/components/layout/Navbar"
import { LiveCounter } from "@/components/shared/LiveCounter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import {
	databases,
	DATABASE_ID,
	ITEMS_COLLECTION,
	INTERVALS_COLLECTION,
	GROUPS_COLLECTION,
	nowISO,
} from "@/lib/appwrite/client"
import { useAuth } from "@/lib/auth/auth-context"
import { ID, Query, type Models } from "appwrite"
import { RiAddLine, RiTimeLine, RiDraggable, RiArrowDownSLine, RiDeleteBinLine } from "@remixicon/react"

export const Route = createFileRoute("/")({
	component: HomePage,
})

export interface ItemWithInterval {
	item: Models.Document
	activeInterval: Models.Document | null
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

export function applyOrder(items: Models.Document[], savedIds: string[]): Models.Document[] {
	const map = new Map(items.map((i) => [i.$id, i]))
	const ordered = savedIds.flatMap((id) => { const v = map.get(id); return v ? [v] : [] })
	const rest = items.filter((i) => !savedIds.includes(i.$id))
	return [...ordered, ...rest]
}

export function applyItemOrder(items: ItemWithInterval[], savedIds: string[]): ItemWithInterval[] {
	const map = new Map(items.map((i) => [i.item.$id, i]))
	const ordered = savedIds.flatMap((id) => { const v = map.get(id); return v ? [v] : [] })
	const rest = items.filter((i) => !savedIds.includes(i.item.$id))
	return [...ordered, ...rest]
}

// ─── SortableItemCard ──────────────────────────────────────────────────────

interface SortableItemCardProps {
	id: string
	item: Models.Document
	activeInterval: Models.Document | null
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
						params={{ itemId: item.$id }}
						className="flex items-center justify-between gap-3 flex-1 min-w-0"
					>
						<CardTitle className="truncate">{item.name as string}</CardTitle>
						{activeInterval && (
							<CardDescription className="shrink-0 font-mono tabular-nums">
								<LiveCounter startedAt={activeInterval.startedAt as string} now={now} />
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
			className={`space-y-2 transition-colors rounded-lg ${isEmpty ? "min-h-[40px] flex items-center justify-center" : "min-h-[4px]"} ${isOver ? "bg-accent/20" : ""}`}
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
	group: Models.Document
	items: ItemWithInterval[]
	now: Date
	isCollapsed: boolean
	onToggleCollapse: () => void
	onDelete: (groupId: string) => void
}

function SortableGroup({ group, items, now, isCollapsed, onToggleCollapse, onDelete }: SortableGroupProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `group-${group.$id}`,
		data: { type: "group" },
	})

	const itemIds = items.map((i) => i.item.$id)

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
					<span className="truncate">{group.name as string}</span>
					<span className="ml-1 text-xs text-muted-foreground font-normal shrink-0">({items.length})</span>
				</button>
				<button
					type="button"
					onClick={() => onDelete(group.$id)}
					className="shrink-0 p-1 text-muted-foreground/30 hover:text-destructive transition-colors"
				>
					<RiDeleteBinLine className="size-3.5" />
				</button>
			</div>

			{!isCollapsed && (
				<div className="mt-2 ml-6">
					<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
						<DroppableItemList groupId={group.$id} isEmpty={items.length === 0}>
							{items.map(({ item, activeInterval }) => (
								<SortableItemCard
									key={item.$id}
									id={item.$id}
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
	const [groups, setGroups] = useState<Models.Document[]>([])
	const [groupedItems, setGroupedItems] = useState<Record<string, ItemWithInterval[]>>({ ungrouped: [] })
	const [isLoadingItems, setIsLoadingItems] = useState(true)
	const [newItemName, setNewItemName] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [now, setNow] = useState(new Date())
	const [activeId, setActiveId] = useState<string | null>(null)
	const [activeType, setActiveType] = useState<"group" | "item" | null>(null)
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
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

	const loadData = useCallback(async () => {
		if (!user) return
		try {
			const [itemsRes, groupsRes] = await Promise.all([
				databases.listDocuments(DATABASE_ID, ITEMS_COLLECTION, [Query.equal("userId", user.$id), Query.limit(100)]),
				databases.listDocuments(DATABASE_ID, GROUPS_COLLECTION, [Query.equal("userId", user.$id), Query.limit(100)]),
			])

			const withIntervals = await Promise.all(
				itemsRes.documents.map(async (item) => {
					const intRes = await databases.listDocuments(DATABASE_ID, INTERVALS_COLLECTION, [
						Query.equal("itemId", item.$id),
						Query.limit(100),
					])
					const activeInterval = intRes.documents.find((i) => !i.endedAt) ?? null
					return { item, activeInterval }
				}),
			)

			const savedGroupOrder = readJson<string[]>(goKey(user.$id), [])
			const orderedGroups = applyOrder(groupsRes.documents, savedGroupOrder)
			setGroups(orderedGroups)

			const newGrouped: Record<string, ItemWithInterval[]> = { ungrouped: [] }
			for (const g of orderedGroups) {
				newGrouped[g.$id] = []
			}
			for (const iwi of withIntervals) {
				const gId = iwi.item.groupId as string | null
				if (gId && newGrouped[gId] !== undefined) {
					newGrouped[gId].push(iwi)
				} else {
					newGrouped.ungrouped.push(iwi)
				}
			}
			for (const key of Object.keys(newGrouped)) {
				const savedOrder = readJson<string[]>(ioKey(key), [])
				newGrouped[key] = applyItemOrder(newGrouped[key], savedOrder)
			}

			setGroupedItems(newGrouped)
			setCollapsed(new Set(readJson<string[]>(colKey(user.$id), [])))
		} catch {
			toast.error("Failed to load items")
		} finally {
			setIsLoadingItems(false)
		}
	}, [user])

	useEffect(() => {
		loadData()
	}, [loadData])

	function findItemGroupId(itemId: string): string {
		for (const [groupId, items] of Object.entries(groupedItems)) {
			if (items.some((i) => i.item.$id === itemId)) return groupId
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
			dragSourceGroupRef.current = findItemGroupId(id)
		}
		setActiveId(id)
	}

	function handleDragOver({ active, over }: DragOverEvent) {
		if (activeTypeRef.current !== "item" || !over) return

		const activeItemId = active.id as string
		const overId = over.id as string
		const currentGroupId = findItemGroupId(activeItemId)

		let targetGroupId: string
		if (overId.startsWith("drop-")) {
			targetGroupId = overId.slice(5)
		} else if (overId.startsWith("group-")) {
			return
		} else {
			targetGroupId = findItemGroupId(overId)
		}

		if (currentGroupId === targetGroupId) {
			const overItemIdx = groupedItems[currentGroupId]?.findIndex((i) => i.item.$id === overId) ?? -1
			if (overItemIdx === -1) return
			setGroupedItems((prev) => {
				const items = prev[currentGroupId]
				const oldIdx = items.findIndex((i) => i.item.$id === activeItemId)
				if (oldIdx === -1 || oldIdx === overItemIdx) return prev
				return { ...prev, [currentGroupId]: arrayMove(items, oldIdx, overItemIdx) }
			})
		} else {
			setGroupedItems((prev) => {
				const src = [...(prev[currentGroupId] ?? [])]
				const dst = [...(prev[targetGroupId] ?? [])]
				const idx = src.findIndex((i) => i.item.$id === activeItemId)
				if (idx === -1) return prev
				const [moved] = src.splice(idx, 1)
				const overIdx = dst.findIndex((i) => i.item.$id === overId)
				if (overIdx !== -1) {
					dst.splice(overIdx, 0, moved)
				} else {
					dst.push(moved)
				}
				return { ...prev, [currentGroupId]: src, [targetGroupId]: dst }
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

		if (type === "group") {
			setGroups((prev) => {
				const oldIdx = prev.findIndex((g) => `group-${g.$id}` === id)
				const newIdx = prev.findIndex((g) => `group-${g.$id}` === overId)
				if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev
				const next = arrayMove(prev, oldIdx, newIdx)
				writeJson(goKey(user.$id), next.map((g) => g.$id))
				return next
			})
		} else if (type === "item") {
			const finalGroupId = findItemGroupId(id)
			const sourceGroupId = dragSourceGroupRef.current
			writeJson(ioKey(finalGroupId), groupedItems[finalGroupId]?.map((i) => i.item.$id) ?? [])
			if (sourceGroupId !== finalGroupId) {
				writeJson(ioKey(sourceGroupId), groupedItems[sourceGroupId]?.map((i) => i.item.$id) ?? [])
				const newGroupId = finalGroupId === "ungrouped" ? null : finalGroupId
				try {
					await databases.updateDocument(DATABASE_ID, ITEMS_COLLECTION, id, { groupId: newGroupId })
				} catch {
					toast.error("Failed to save item group")
					loadData()
				}
			}
		}
	}

	// ─── Create item ────────────────────────────────────────────────────────

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		if (!user || !newItemName.trim()) return
		setIsCreating(true)
		try {
			const item = await databases.createDocument(DATABASE_ID, ITEMS_COLLECTION, ID.unique(), {
				name: newItemName.trim(),
				userId: user.$id,
			})
			await databases.createDocument(DATABASE_ID, INTERVALS_COLLECTION, ID.unique(), {
				itemId: item.$id,
				userId: user.$id,
				startedAt: nowISO(),
			})
			setNewItemName("")
			await loadData()
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
			const group = await databases.createDocument(DATABASE_ID, GROUPS_COLLECTION, ID.unique(), {
				name: newGroupName.trim(),
				userId: user.$id,
			})
			setGroups((prev) => {
				const next = [...prev, group]
				writeJson(goKey(user.$id), next.map((g) => g.$id))
				return next
			})
			setGroupedItems((prev) => ({ ...prev, [group.$id]: [] }))
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

	async function handleDeleteGroup(groupId: string) {
		if (!user) return
		try {
			await databases.deleteDocument(DATABASE_ID, GROUPS_COLLECTION, groupId)
			const itemsInGroup = groupedItems[groupId] ?? []
			await Promise.all(
				itemsInGroup.map(({ item }) =>
					databases.updateDocument(DATABASE_ID, ITEMS_COLLECTION, item.$id, { groupId: null }),
				),
			)
			setGroups((prev) => {
				const next = prev.filter((g) => g.$id !== groupId)
				writeJson(goKey(user.$id), next.map((g) => g.$id))
				return next
			})
			setGroupedItems((prev) => {
				const { [groupId]: removed, ...rest } = prev
				return { ...rest, ungrouped: [...(rest.ungrouped ?? []), ...(removed ?? [])] }
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
			if (user) writeJson(colKey(user.$id), [...next])
			return next
		})
	}

	// ─── Derive overlay content ───────────────────────────────────────────────

	const activeItem =
		activeId && activeType === "item"
			? Object.values(groupedItems)
					.flat()
					.find((i) => i.item.$id === activeId)
			: null
	const activeGroup =
		activeId && activeType === "group" ? groups.find((g) => `group-${g.$id}` === activeId) : null

	const groupIds = groups.map((g) => `group-${g.$id}`)
	const ungroupedItems = groupedItems.ungrouped ?? []
	const isEmpty = groups.length === 0 && Object.values(groupedItems).every((arr) => arr.length === 0)

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
							{groups.length > 0 && (
								<SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
									<div className="space-y-4">
										{groups.map((group) => (
											<SortableGroup
												key={group.$id}
												group={group}
												items={groupedItems[group.$id] ?? []}
												now={now}
												isCollapsed={collapsed.has(group.$id)}
												onToggleCollapse={() => toggleCollapse(group.$id)}
												onDelete={handleDeleteGroup}
											/>
										))}
									</div>
								</SortableContext>
							)}

							{ungroupedItems.length > 0 && (
								<>
									{groups.length > 0 && (
										<p className="text-xs text-muted-foreground/50 font-medium uppercase tracking-wider">Ungrouped</p>
									)}
									<SortableContext
										items={ungroupedItems.map((i) => i.item.$id)}
										strategy={verticalListSortingStrategy}
									>
										<DroppableItemList groupId="ungrouped">
											{ungroupedItems.map(({ item, activeInterval }) => (
												<SortableItemCard
													key={item.$id}
													id={item.$id}
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
											<CardTitle className="truncate">{activeItem.item.name as string}</CardTitle>
											{activeItem.activeInterval && (
												<CardDescription className="shrink-0 font-mono tabular-nums">
													<LiveCounter startedAt={activeItem.activeInterval.startedAt as string} now={now} />
												</CardDescription>
											)}
										</div>
									</div>
								</Card>
							)}
							{activeGroup && (
								<div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
									<RiDraggable className="size-4 text-muted-foreground/50" />
									<span className="text-sm font-semibold">{activeGroup.name as string}</span>
								</div>
							)}
						</DragOverlay>
					</DndContext>
				)}
			</main>
		</div>
	)
}
