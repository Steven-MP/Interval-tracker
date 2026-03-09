import { describe, it, expect } from "bun:test"
import { cn } from "./utils"

describe("cn", () => {
	it("merges multiple class names", () => {
		expect(cn("foo", "bar", "baz")).toBe("foo bar baz")
	})

	it("ignores falsy values", () => {
		expect(cn("foo", false && "bar", undefined, null, "", "baz")).toBe("foo baz")
	})

	it("handles conditional object syntax from clsx", () => {
		expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz")
	})

	it("handles array syntax from clsx", () => {
		expect(cn(["foo", "bar"])).toBe("foo bar")
	})

	it("resolves tailwind conflicts — later class wins", () => {
		expect(cn("px-2", "px-4")).toBe("px-4")
		expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
	})

	it("merges conditional tailwind conflicts correctly", () => {
		expect(cn("p-4", true && "p-2")).toBe("p-2")
		expect(cn("p-4", false && "p-2")).toBe("p-4")
	})

	it("returns an empty string when given no truthy inputs", () => {
		expect(cn(false, undefined, null, "")).toBe("")
	})
})
