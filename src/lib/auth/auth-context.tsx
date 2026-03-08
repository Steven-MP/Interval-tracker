import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react"
import { account } from "../appwrite/client"
import type { Models } from "appwrite"

interface AuthContextValue {
	user: Models.User<Models.Preferences> | null
	isLoading: boolean
	login: (email: string, password: string) => Promise<void>
	register: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let mounted = true

		async function init() {
			try {
				const current = await account.get()
				if (mounted) setUser(current)
			} catch {
				if (mounted) setUser(null)
			} finally {
				if (mounted) setIsLoading(false)
			}
		}

		init()

		return () => {
			mounted = false
		}
	}, [])

	async function login(email: string, password: string) {
		await account.createEmailPasswordSession(email, password)
		const current = await account.get()
		setUser(current)
	}

	async function register(email: string, password: string) {
		await account.create("unique()", email, password)
		await account.createEmailPasswordSession(email, password)
		const current = await account.get()
		setUser(current)
	}

	async function logout() {
		await account.deleteSession("current")
		setUser(null)
	}

	return (
		<AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}
