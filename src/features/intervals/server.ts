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
const INTERVALS = "intervals"

export const getIntervals = createServerFn()
	.inputValidator(z.object({ itemId: z.string() }))
	.handler(async ({ data }) => {
		const { databases, account } = getAppwriteClient()
		const user = await account.get()
		const res = await databases.listDocuments(DB(), INTERVALS, [
			Query.equal("itemId", data.itemId),
			Query.equal("userId", user.$id),
			Query.orderDesc("startedAt"),
		])
		return res.documents
	})

export const createInterval = createServerFn()
	.inputValidator(z.object({ itemId: z.string(), startedAt: z.string() }))
	.handler(async ({ data }) => {
		const { databases, account } = getAppwriteClient()
		const user = await account.get()
		return databases.createDocument(DB(), INTERVALS, ID.unique(), {
			itemId: data.itemId,
			userId: user.$id,
			startedAt: data.startedAt,
		})
	})

export const endInterval = createServerFn()
	.inputValidator(z.object({ intervalId: z.string(), endedAt: z.string() }))
	.handler(async ({ data }) => {
		const { databases } = getAppwriteClient()
		return databases.updateDocument(DB(), INTERVALS, data.intervalId, {
			endedAt: data.endedAt,
		})
	})
