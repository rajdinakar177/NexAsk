import {
  Client,
  Account,
  Databases,
  Storage,
  Avatars,
} from "appwrite";

import env from "@/app/env";

const client = new Client();

client
  .setEndpoint(env.ENDPOINT)
  .setProject(env.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

export default client;