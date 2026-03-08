import { useRouter } from "@tanstack/react-router"
import { RiLogoutBoxLine } from "@remixicon/react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function Navbar() {
	const { logout } = useAuth()
	const router = useRouter()

	async function handleLogout() {
		try {
			await logout()
			router.navigate({ to: "/login" })
		} catch {
			toast.error("Failed to log out")
		}
	}

	return (
		<header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
			<div className="flex h-14 items-center px-4 gap-3 max-w-2xl mx-auto">
				<span className="font-semibold flex-1">Interval Tracker</span>
				<Button variant="ghost" size="icon-sm" onClick={handleLogout}>
					<RiLogoutBoxLine className="size-4" />
				</Button>
			</div>
		</header>
	)
}
