const env = {
  PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string,
  PROJECT_NAME: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME as string,
  ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string,
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY as string,

    // Social links
  GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL as string,
  LINKEDIN_URL: process.env.NEXT_PUBLIC_LINKEDIN_URL as string,
  TWITTER_URL: process.env.NEXT_PUBLIC_TWITTER_URL as string,
  INSTAGRAM_URL: process.env.NEXT_PUBLIC_INSTAGRAM_URL as string,
  PORTFOLIO_URL: process.env.NEXT_PUBLIC_PORTFOLIO_URL as string,
  EMAIL: process.env.NEXT_PUBLIC_EMAIL as string,
};

export default env;