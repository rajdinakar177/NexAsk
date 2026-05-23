import { Permission } from "node-appwrite"

import { db, questionsCollection } from "@/app/models/name"
import { databases } from "./config"

async function waitForAttribute(
  collectionId: string,
  key: string
) {
  while (true) {
    const attribute = await databases.getAttribute(
      db,
      collectionId,
      key
    )

    if (attribute.status === "available") {
      break
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    )
  }
}

export default async function createQuestionCollection() {

  // Create collection
  await databases.createCollection(
    db,
    questionsCollection,
    questionsCollection,
    [
      Permission.read("any"),
      Permission.create("users"),
      Permission.update("users"),
      Permission.delete("users"),
    ]
  )

  console.log("Collection created")

  // Create attributes
  await Promise.all([
    databases.createStringAttribute(
      db,
      questionsCollection,
      "title",
      100,
      true
    ),

    databases.createStringAttribute(
      db,
      questionsCollection,
      "content",
      10000,
      true
    ),

    databases.createStringAttribute(
      db,
      questionsCollection,
      "authorId",
      50,
      true
    ),

    databases.createStringAttribute(
      db,
      questionsCollection,
      "tags",
      50,
      true,
      undefined,
      true
    ),

    databases.createStringAttribute(
      db,
      questionsCollection,
      "attachmentId",
      50,
      false
    ),
  ])

  console.log("Attributes creating...")

  // Wait for attributes
  await waitForAttribute(questionsCollection, "title")
  await waitForAttribute(questionsCollection, "content")

  console.log("Attributes available")

  // Create indexes
  await Promise.all([
    databases.createIndex(
      db,
      questionsCollection,
      "title_index",
      "fulltext",
      ["title"]
    ),

    databases.createIndex(
      db,
      questionsCollection,
      "content_index",
      "fulltext",
      ["content"]
    ),
  ])

  console.log("Indexes created")
}