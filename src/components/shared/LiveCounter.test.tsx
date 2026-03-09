import { describe, it, expect } from "bun:test"
import { render } from "@testing-library/react"
import { formatDuration, LiveCounter } from "./LiveCounter"

describe("formatDuration", () => {
	it("formats zero milliseconds as 0s", () => {
		expect(formatDuration(0)).toBe("0s")
	})

	it("formats whole seconds only", () => {
		expect(formatDuration(1000)).toBe("1s")
		expect(formatDuration(45000)).toBe("45s")
		expect(formatDuration(59000)).toBe("59s")
	})

	it("floors partial seconds", () => {
		expect(formatDuration(1500)).toBe("1s")
		expect(formatDuration(59999)).toBe("59s")
	})

	it("formats minutes and seconds", () => {
		expect(formatDuration(60000)).toBe("1m 0s")
		expect(formatDuration(90000)).toBe("1m 30s")
		expect(formatDuration(3599000)).toBe("59m 59s")
	})

	it("formats hours, minutes, and seconds", () => {
		expect(formatDuration(3600000)).toBe("1h 0s")
		expect(formatDuration(3661000)).toBe("1h 1m 1s")
		expect(formatDuration(7322000)).toBe("2h 2m 2s")
	})

	it("formats days, hours, minutes, and seconds", () => {
		expect(formatDuration(86400000)).toBe("1d 0s")
		expect(formatDuration(90061000)).toBe("1d 1h 1m 1s")
	})

	it("clamps negative values to 0s", () => {
		expect(formatDuration(-1)).toBe("0s")
		expect(formatDuration(-99999)).toBe("0s")
	})
})

describe("LiveCounter", () => {
	it("renders the elapsed duration between startedAt and now", () => {
		const startedAt = "2024-01-01T00:00:00.000Z"
		const now = new Date("2024-01-01T00:01:30.000Z")
		const { container } = render(<LiveCounter startedAt={startedAt} now={now} />)
		expect(container.textContent).toBe("1m 30s")
	})

	it("renders 0s when now equals startedAt", () => {
		const ts = "2024-06-15T12:00:00.000Z"
		const { container } = render(<LiveCounter startedAt={ts} now={new Date(ts)} />)
		expect(container.textContent).toBe("0s")
	})

	it("renders 0s when now is before startedAt", () => {
		const startedAt = "2024-01-01T00:01:00.000Z"
		const now = new Date("2024-01-01T00:00:00.000Z")
		const { container } = render(<LiveCounter startedAt={startedAt} now={now} />)
		expect(container.textContent).toBe("0s")
	})

	it("renders correctly for durations spanning days", () => {
		const startedAt = "2024-01-01T00:00:00.000Z"
		const now = new Date("2024-01-02T01:01:01.000Z")
		const { container } = render(<LiveCounter startedAt={startedAt} now={now} />)
		expect(container.textContent).toBe("1d 1h 1m 1s")
	})
})
