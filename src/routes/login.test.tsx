import { describe, it, expect, mock, afterEach, beforeAll } from "bun:test"
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react"

const mockNavigate = mock(() => {})
const mockLogin = mock(async (_email: string, _password: string) => {})
const mockRegister = mock(async (_email: string, _password: string) => {})

mock.module("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
	createFileRoute: () => (cfg: { component: unknown }) => cfg,
}))

mock.module("../lib/auth/auth-context", () => ({
	useAuth: () => ({
		user: null,
		isLoading: false,
		login: mockLogin,
		register: mockRegister,
		logout: mock(async () => {}),
	}),
}))

let LoginPage: () => JSX.Element

beforeAll(async () => {
	const mod = await import("./login")
	LoginPage = mod.LoginPage
})

afterEach(() => {
	cleanup()
	mockLogin.mockClear()
	mockRegister.mockClear()
	mockNavigate.mockClear()
})

describe("LoginPage", () => {
	it("renders in login mode by default", () => {
		render(<LoginPage />)
		expect(screen.getByText("Sign in to your account")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()
	})

	it("shows the Sign up toggle in login mode", () => {
		render(<LoginPage />)
		expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument()
	})

	it("switches to register mode when Sign up is clicked", () => {
		render(<LoginPage />)
		fireEvent.click(screen.getByRole("button", { name: "Sign up" }))
		expect(screen.getByText("Create an account")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument()
	})

	it("switches back to login mode when Sign in is clicked", () => {
		render(<LoginPage />)
		fireEvent.click(screen.getByRole("button", { name: "Sign up" }))
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
		expect(screen.getByText("Sign in to your account")).toBeInTheDocument()
	})

	it("clears any error when switching modes", async () => {
		mockLogin.mockRejectedValueOnce(new Error("Bad credentials"))
		render(<LoginPage />)
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } })
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign In" })) })
		expect(screen.getByText("Bad credentials")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Sign up" }))
		expect(screen.queryByText("Bad credentials")).not.toBeInTheDocument()
	})

	it("calls login with the entered email and password", async () => {
		render(<LoginPage />)
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign In" })) })
		expect(mockLogin).toHaveBeenCalledWith("user@example.com", "secret123")
	})

	it("calls register with the entered email and password in register mode", async () => {
		render(<LoginPage />)
		fireEvent.click(screen.getByRole("button", { name: "Sign up" }))
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } })
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "newpass123" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create Account" })) })
		expect(mockRegister).toHaveBeenCalledWith("new@example.com", "newpass123")
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
