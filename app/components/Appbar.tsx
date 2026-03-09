"use client"
import { signIn } from "next-auth/react"
export function  Appbar (){
    return(
        <div>
            <div className="flex justify-between">
                <div>
                    spotit
                </div>
                <div>
                    <button className="m-2 p-2" onClick={()=> signIn()}>signin</button>
                </div>
            </div>
        </div>
    )
}