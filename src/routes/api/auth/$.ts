import { createFileRoute } from "@tanstack/react-router"
import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start"

const betterAuth = convexBetterAuthReactStart({
	convexUrl: process.env.CONVEX_URL ?? "",
	convexSiteUrl: process.env.CONVEX_SITE_URL ?? "",
})

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => betterAuth.handler(request),
			POST: ({ request }) => betterAuth.handler(request),
		},
	},
})
