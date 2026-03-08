import { Client, Account, Databases } from "appwrite"

const client = new Client()
	.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
	.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

export const account = new Account(client)
export const databases = new Databases(client)
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID
export const ITEMS_COLLECTION = "items"
export const INTERVALS_COLLECTION = "intervals"
export const GROUPS_COLLECTION = "groups"

export function nowISO() {
	return new Date().toISOString().replace(/Z$/, "+00:00")
}
