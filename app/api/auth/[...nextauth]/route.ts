import GoogleProvider from "next-auth/providers/google";
import NextAuth from "next-auth"
import { prismaClient } from "@/app/lib/db";

const handler = NextAuth({
  providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
  })
],
secret: process.env.NEXTAUTH_SECRET ?? "secret",
callbacks: {
  async signIn({ user }) {
    await prismaClient.user.upsert({
      where: { email: user.email! },
      update: {},
      create: {
        email: user.email!,
        name: user.name!,
        provider: "Google",
        role:"EndUser"
      }
    })

    return true
  }
}
})

export { handler as GET, handler as POST }

