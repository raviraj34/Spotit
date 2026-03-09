"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({Children}:{
    Children: React.ReactNode
}){
return <SessionProvider>
    {Children}
</SessionProvider>

}
 