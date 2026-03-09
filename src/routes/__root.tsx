import { useEffect } from "react"
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router"

import { AuthProvider, useAuth } from "@/lib/auth/auth-context"
import { Toaster } from "@/components/ui/sonner"

import appCss from "../styles.css?url"

const DARK_MODE_SCRIPT = `(function(){var mq=window.matchMedia('(prefers-color-scheme: dark)');function apply(e){document.documentElement.classList.toggle('dark',e.matches)}apply(mq);mq.addEventListener('change',apply);})();`

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{ name: "apple-mobile-web-app-title", content: "Intervals" },
			{ name: "theme-color", content: "#18181b" },
			{ title: "Interval Tracker" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "apple-touch-icon", href: "/icon-192.png" },
		],
	}),

	shellComponent: RootDocument,
	component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — inline script for flicker-free dark mode before first paint */}
			<script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
				<HeadContent />
			</head>
			<body>
				<AuthProvider>
					{children}
					<Toaster richColors />
				</AuthProvider>
				<Scripts />
			</body>
		</html>
	)
}

function RootComponent() {
	const location = useLocation()
	const navigate = useNavigate()
	const { user, isLoading } = useAuth()

	const isPublicPage = location.pathname === "/login"

	useEffect(() => {
		if (isLoading) return

		if (!user && !isPublicPage) {
			navigate({ to: "/login" })
		}

		if (user && location.pathname === "/login") {
			navigate({ to: "/" })
		}
	}, [user, isLoading, isPublicPage, location.pathname, navigate])

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="size-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
			</div>
		)
	}

	if (!user && !isPublicPage) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="size-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
			</div>
		)
	}

	return <Outlet />
}
