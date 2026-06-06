import { describe, it, expect, mock, afterEach, beforeAll } from "bun:test"
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react"
import type { ComponentType } from "react"

const mockNavigate = mock(() => {})
const mockLogin = mock(async (_email: string, _password: string) => {})

mock.module("../lib/auth/auth-client", () => ({
	authClient: {
		useSession: () => ({ data: null, isPending: false }),
		signIn: { email: async () => ({ error: null }) },
		signUp: { email: async () => ({ error: null }) },
		signOut: async () => {},
	},
}))

mock.module("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
	createFileRoute: () => (cfg: { component: unknown }) => cfg,
}))

mock.module("../lib/auth/auth-context", () => ({
	useAuth: () => ({
		user: null,
		isLoading: false,
		login: mockLogin,
		register: mock(async () => {}),
		logout: mock(async () => {}),
	}),
}))

let LoginPage: ComponentType<object>

beforeAll(async () => {
	const mod = await import("./login")
	LoginPage = mod.LoginPage
})

afterEach(() => {
	cleanup()
	mockLogin.mockClear()
	mockNavigate.mockClear()
})

describe("LoginPage", () => {
	it("renders the login form", () => {
		render(<LoginPage />)
		expect(screen.getByText("Sign in to your account")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()
	})

	it("does not show a sign up toggle", () => {
		render(<LoginPage />)
		expect(screen.queryByRole("button", { name: "Sign up" })).not.toBeInTheDocument()
	})

	it("calls login with the entered email and password", async () => {
		render(<LoginPage />)
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign In" })) })
		expect(mockLogin).toHaveBeenCalledWith("user@example.com", "secret123")
	})

	it("displays an error message when login throws", async () => {
		mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"))
		render(<LoginPage />)
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "x@y.com" } })
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign In" })) })
		expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
	})

	it("navigates to / after successful login", async () => {
		render(<LoginPage />)
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ok@example.com" } })
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "validpass" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign In" })) })
		expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
	})
})
