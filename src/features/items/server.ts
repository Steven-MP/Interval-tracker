import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { Client, Account, Databases, ID, Query } from "appwrite"

function getAppwriteClient() {
	const client = new Client()
		.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
		.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)
	return { client, databases: new Databases(client), account: new Account(client) }
}

const DB = () => import.meta.env.VITE_APPWRITE_DATABASE_ID
const ITEMS = "items"
const INTERVALS = "intervals"

export const getItems = createServerFn().handler(async () => {
	const { databases, account } = getAppwriteClient()
	const user = await account.get()
	const res = await databases.listDocuments(DB(), ITEMS, [
		Query.equal("userId", user.$id),
		Query.orderDesc("createdAt"),
	])
	return res.documents
})

export const createItem = createServerFn()
	.inputValidator(z.object({ name: z.string().min(1) }))
	.handler(async ({ data }) => {
		const { databases, account } = getAppwriteClient()
		const user = await account.get()
		const now = new Date().toISOString()

		const item = await databases.createDocument(DB(), ITEMS, ID.unique(), {
			name: data.name,
			userId: user.$id,
			createdAt: now,
		})

		await databases.createDocument(DB(), INTERVALS, ID.unique(), {
			itemId: item.$id,
			userId: user.$id,
			startedAt: now,
		})

		return item
	})

export const deleteItem = createServerFn()
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const { databases, account } = getAppwriteClient()
		const user = await account.get()

		const intervals = await databases.listDocuments(DB(), INTERVALS, [
			Query.equal("itemId", data.id),
			Query.equal("userId", user.$id),
		])

		await Promise.all(
			intervals.documents.map((i) => databases.deleteDocument(DB(), INTERVALS, i.$id)),
		)

		await databases.deleteDocument(DB(), ITEMS, data.id)
	})
