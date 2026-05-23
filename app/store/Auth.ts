import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { persist } from "zustand/middleware"
// ✅ Correct — use the client SDK
import { AppwriteException, ID, Models } from "appwrite"
import { account } from "../models/client/config"

export interface UserPref {
    reputation?: number
}

interface IAuthStore {
    session: Models.Session | null
    jwt: string | null
    user: Models.User<UserPref> | null
    hydrated: boolean

    setHydrated: () => void

    verifySession: () => Promise<void>
    login: (email: string, password: string) => Promise<{
        success: boolean;
        error?: AppwriteException | null
    }>
    createAccount: (
        name: string,
        email: string,
        password: string
    ) => Promise<{
        success: boolean;
        error?: AppwriteException | null
    }>
    logout: () => Promise<void>
}

export const useAuthStore = create<IAuthStore>()(
    persist(
        immer((set) => ({
            session: null,
            jwt: null,
            user: null,
            hydrated: false,

            setHydrated() {
                set({ hydrated: true })
            },

            async createAccount(
                name,
                email,
                password
            ) {

                try {

                    await account.create(
                        ID.unique(),
                        email,
                        password,
                        name
                    )

                    const session =
                        await account.createEmailPasswordSession(
                            email,
                            password
                        )

                    const [user, jwtResponse] =
                        await Promise.all([
                            account.get<UserPref>(),
                            account.createJWT()
                        ])

                    set({
                        session,
                        user,
                        jwt: jwtResponse.jwt
                    })

                    return {
                        success: true
                    }

                } catch (error) {

                    return {
                        success: false,
                        error: error as AppwriteException
                    }

                }
            },


            async login(email, password) {

                try {

                    const session =
                        await account.createEmailPasswordSession(
                            email,
                            password
                        )

                    const [user, jwtResponse] =
                        await Promise.all([
                            account.get<UserPref>(),
                            account.createJWT()
                        ])

                    if (user.prefs?.reputation === undefined) {
                        await account.updatePrefs({
                            reputation: 0
                        })
                    }

                    set({
                        session,
                        user,
                        jwt: jwtResponse.jwt
                    })

                    return {
                        success: true
                    }

                } catch (error) {

                    return {
                        success: false,
                        error: error as AppwriteException
                    }

                }
            },
            async verifySession() {
                try {
                    const user = await account.get()

                    const [session, jwt] = await Promise.all([
                        account.getSession("current"),
                        account.createJWT()
                    ])

                    set({
                        user,
                        session,
                        jwt: jwt.jwt
                    })

                } catch (error) {
                    set({
                        user: null,
                        session: null,
                        jwt: null
                    })
                }
            },


            async logout() {

                try {

                    await account.deleteSession("current")

                    set({
                        session: null,
                        user: null,
                        jwt: null
                    })

                } catch (error) {

                    console.error(error)

                }
            }

        })),
        {
            name: "auth",

           onRehydrateStorage() {
    return async (state) => {
        try {
            await account.getSession("current")
        } catch {
            state?.set({
                user: null,
                session: null,
                jwt: null
            })
        }

        state?.setHydrated()
    }
}
        }
    )
)