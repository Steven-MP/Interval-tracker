import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"

async function requireUserId(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
	const identity = await ctx.auth.getUserIdentity()
	if (!identity) throw new ConvexError("Unauthenticated")
	return identity.subject
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx)
		return ctx.db
			.query("items")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect()
	},
})

export const get = query({
	args: { itemId: v.id("items") },
	handler: async (ctx, { itemId }) => {
		const userId = await requireUserId(ctx)
		const item = await ctx.db.get(itemId)
		if (!item || item.userId !== userId) return null
		return item
	},
})

export const create = mutation({
	args: { name: v.string() },
	handler: async (ctx, { name }) => {
		const userId = await requireUserId(ctx)
		const now = new Date().toISOString()
		const itemId = await ctx.db.insert("items", { name, userId, createdAt: now })
		await ctx.db.insert("intervals", { itemId, userId, startedAt: now })
		return itemId
	},
})

export const remove = mutation({
	args: { itemId: v.id("items") },
	handler: async (ctx, { itemId }) => {
		const userId = await requireUserId(ctx)
		const item = await ctx.db.get(itemId)
		if (!item || item.userId !== userId) throw new ConvexError("Not found")
		const intervals = await ctx.db
			.query("intervals")
			.withIndex("by_item", (q) => q.eq("itemId", itemId))
			.collect()
		await Promise.all(intervals.map((i) => ctx.db.delete(i._id)))
		await ctx.db.delete(itemId)
	},
})

export const updateGroup = mutation({
	args: { itemId: v.id("items"), groupId: v.optional(v.id("groups")) },
	handler: async (ctx, { itemId, groupId }) => {
		const userId = await requireUserId(ctx)
		const item = await ctx.db.get(itemId)
		if (!item || item.userId !== userId) throw new ConvexError("Not found")
		await ctx.db.patch(itemId, { groupId })
	},
})
