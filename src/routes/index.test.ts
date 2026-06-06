import { describe, it, expect, mock, beforeAll } from "bun:test"
import type { ItemWithInterval } from "./index"

// Mock Convex runtime — applyOrder / applyItemOrder are pure functions that use no network APIs.
mock.module("convex/react", () => ({
	useQuery: () => undefined,
	useMutation: () => async () => {},
}))

mock.module("../../convex/_generated/api", () => ({
	api: { items: {}, intervals: {}, groups: {} },
}))

mock.module("@tanstack/react-router", () => ({
	createFileRoute: () => () => null,
	Link: () => null,
	useRouter: () => ({ navigate: () => {} }),
	useNavigate: () => () => {},
}))
mock.module("sonner", () => ({ toast: { error: () => {}, success: () => {} } }))
mock.module("@dnd-kit/core", () => ({
	DndContext: () => null,
	DragOverlay: () => null,
	PointerSensor: class {},
	useSensor: () => null,
	useSensors: () => null,
	useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
}))
mock.module("@dnd-kit/sortable", () => ({
	SortableContext: () => null,
	useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, transition: null, isDragging: false }),
	verticalListSortingStrategy: null,
	arrayMove: () => [],
}))
mock.module("@dnd-kit/utilities", () => ({ CSS: { Transform: { toString: () => "" } } }))
mock.module("../lib/auth/auth-context", () => ({ useAuth: () => ({ user: null }) }))

let applyOrder: (items: { _id: string }[], savedIds: string[]) => { _id: string }[]
let applyItemOrder: (items: ItemWithInterval[], savedIds: string[]) => ItemWithInterval[]

beforeAll(async () => {
	const mod = await import("./index")
	applyOrder = mod.applyOrder as any
	applyItemOrder = mod.applyItemOrder
})

// Minimal stubs — tests only exercise the ID-based ordering logic
function doc(id: string) {
	return { _id: id } as any
}

function iwi(id: string): ItemWithInterval {
	return { item: doc(id), activeInterval: null }
}

describe("applyOrder", () => {
	it("orders items according to savedIds", () => {
		const items = [doc("a"), doc("b"), doc("c")]
		const result = applyOrder(items, ["c", "a", "b"])
		expect(result.map((d) => d._id)).toEqual(["c", "a", "b"])
	})

	it("appends items not present in savedIds after ordered items", () => {
		const items = [doc("a"), doc("b"), doc("c")]
		const result = applyOrder(items, ["b"])
		expect(result.map((d) => d._id)).toEqual(["b", "a", "c"])
	})

	it("ignores savedIds that do not match any item", () => {
		const items = [doc("a"), doc("b")]
		const result = applyOrder(items, ["x", "a", "y", "b"])
		expect(result.map((d) => d._id)).toEqual(["a", "b"])
	})

	it("returns original order when savedIds is empty", () => {
		const items = [doc("a"), doc("b"), doc("c")]
		const result = applyOrder(items, [])
		expect(result.map((d) => d._id)).toEqual(["a", "b", "c"])
	})

	it("returns empty array when items is empty", () => {
		expect(applyOrder([], ["a", "b"])).toEqual([])
	})
})

describe("applyItemOrder", () => {
	it("orders ItemWithInterval entries according to savedIds", () => {
		const items = [iwi("a"), iwi("b"), iwi("c")]
		const result = applyItemOrder(items, ["c", "b", "a"])
		expect(result.map((i) => i.item._id)).toEqual(["c", "b", "a"])
	})

	it("appends unordered items after ordered items", () => {
		const items = [iwi("a"), iwi("b"), iwi("c")]
		const result = applyItemOrder(items, ["c"])
		expect(result.map((i) => i.item._id)).toEqual(["c", "a", "b"])
	})

	it("ignores savedIds with no matching item", () => {
		const items = [iwi("a"), iwi("b")]
		const result = applyItemOrder(items, ["z", "a"])
		expect(result.map((i) => i.item._id)).toEqual(["a", "b"])
	})

	it("returns original order when savedIds is empty", () => {
		const items = [iwi("x"), iwi("y")]
		const result = applyItemOrder(items, [])
		expect(result.map((i) => i.item._id)).toEqual(["x", "y"])
	})
})
