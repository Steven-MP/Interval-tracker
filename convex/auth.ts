import { betterAuth } from "better-auth/minimal"
import { createClient } from "@convex-dev/better-auth"
import { convex as convexPlugin } from "@convex-dev/better-auth/plugins"
import { components } from "./_generated/api"
import authConfig from "./auth.config"

export const authComponent = createClient(components.betterAuth)

export const createAuth = (ctx: any) =>
	betterAuth({
		database: authComponent.adapter(ctx),
		emailAndPassword: { enabled: true },
		trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") ?? [],
		plugins: [convexPlugin({ authConfig })],
	})

export const { getAuthUser } = authComponent.clientApi()
