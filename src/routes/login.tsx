import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/login")({
	component: LoginPage,
})

type Mode = "login" | "register"

function LoginPage() {
	const [mode, setMode] = useState<Mode>("login")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const { login, register } = useAuth()
	const navigate = useNavigate()

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setIsLoading(true)

		try {
			if (mode === "login") {
				await login(email, password)
			} else {
				await register(email, password)
			}
			navigate({ to: "/" })
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Interval Tracker</CardTitle>
					<CardDescription>
						{mode === "login" ? "Sign in to your account" : "Create an account"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
								{error}
							</p>
						)}

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
							/>
						</div>

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading
								? "Please wait…"
								: mode === "login"
									? "Sign In"
									: "Create Account"}
						</Button>

						<p className="text-center text-sm text-muted-foreground">
							{mode === "login" ? (
								<>
									No account?{" "}
									<button
										type="button"
										className="underline hover:text-foreground transition-colors"
										onClick={() => {
											setMode("register")
											setError(null)
										}}
									>
										Sign up
									</button>
								</>
							) : (
								<>
									Have an account?{" "}
									<button
										type="button"
										className="underline hover:text-foreground transition-colors"
										onClick={() => {
											setMode("login")
											setError(null)
										}}
									>
										Sign in
									</button>
								</>
							)}
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
