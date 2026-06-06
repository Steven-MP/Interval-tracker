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
			.query("groups")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect()
	},
})

export const create = mutation({
	args: { name: v.string() },
	handler: async (ctx, { name }) => {
		const userId = await requireUserId(ctx)
		return ctx.db.insert("groups", { name, userId })
	},
})

export const remove = mutation({
	args: { groupId: v.id("groups") },
	handler: async (ctx, { groupId }) => {
		const userId = await requireUserId(ctx)
		const group = await ctx.db.get(groupId)
		if (!group || group.userId !== userId) throw new ConvexError("Not found")
		await ctx.db.delete(groupId)
	},
})
