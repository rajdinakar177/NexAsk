
import env from "@/app/env";

import {
  Client,
  Users,
  Databases,
  Storage,
  Avatars,
} from "node-appwrite";

const client = new Client();

client
  .setEndpoint(env.ENDPOINT)
  .setProject(env.PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

export const users = new Users(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

export default client;