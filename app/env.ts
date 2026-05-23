const env = {
  PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string,
  PROJECT_NAME: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME as string,
  ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string,
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY as string
};

export default env;