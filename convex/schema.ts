import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	items: defineTable({
		name: v.string(),
		userId: v.string(),
		groupId: v.optional(v.id("groups")),
		createdAt: v.string(),
	}).index("by_user", ["userId"]),

	intervals: defineTable({
		itemId: v.id("items"),
		userId: v.string(),
		startedAt: v.string(),
		endedAt: v.optional(v.string()),
	})
		.index("by_item", ["itemId"])
		.index("by_user", ["userId"]),

	groups: defineTable({
		name: v.string(),
		userId: v.string(),
	}).index("by_user", ["userId"]),
})
