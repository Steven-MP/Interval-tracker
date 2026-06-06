import { createContext, useContext, type ReactNode } from "react"
import { authClient } from "./auth-client"

interface AuthUser {
	id: string
	email: string
	name: string
}

interface AuthContextValue {
	user: AuthUser | null
	isLoading: boolean
	login: (email: string, password: string) => Promise<void>
	register: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const { data: session, isPending } = authClient.useSession()

	async function login(email: string, password: string) {
		const res = await authClient.signIn.email({ email, password })
		if (res.error) throw new Error(res.error.message ?? "Sign in failed")
	}

	async function register(email: string, password: string) {
		const res = await authClient.signUp.email({ email, password, name: email })
		if (res.error) throw new Error(res.error.message ?? "Sign up failed")
	}

	async function logout() {
		await authClient.signOut()
	}

	return (
		<AuthContext.Provider
			value={{
				user: session?.user ?? null,
				isLoading: isPending,
				login,
				register,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const ctx = useContext(AuthContext)
	if (ctx === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return ctx
}
