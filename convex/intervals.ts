import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"

async function requireUserId(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
	const identity = await ctx.auth.getUserIdentity()
	if (!identity) throw new ConvexError("Unauthenticated")
	return identity.subject
}

export const listByItem = query({
	args: { itemId: v.id("items") },
	handler: async (ctx, { itemId }) => {
		const userId = await requireUserId(ctx)
		return ctx.db
			.query("intervals")
			.withIndex("by_item", (q) => q.eq("itemId", itemId))
			.filter((q) => q.eq(q.field("userId"), userId))
			.collect()
	},
})

export const listActiveByUser = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx)
		return ctx.db
			.query("intervals")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.filter((q) => q.eq(q.field("endedAt"), undefined))
			.collect()
	},
})

export const create = mutation({
	args: { itemId: v.id("items"), startedAt: v.string() },
	handler: async (ctx, { itemId, startedAt }) => {
		const userId = await requireUserId(ctx)
		return ctx.db.insert("intervals", { itemId, userId, startedAt })
	},
})

export const end = mutation({
	args: { intervalId: v.id("intervals"), endedAt: v.string() },
	handler: async (ctx, { intervalId, endedAt }) => {
		const userId = await requireUserId(ctx)
		const interval = await ctx.db.get(intervalId)
		if (!interval || interval.userId !== userId) throw new ConvexError("Not found")
		await ctx.db.patch(intervalId, { endedAt })
	},
})
