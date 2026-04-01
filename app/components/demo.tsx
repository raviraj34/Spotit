"use client"
import { useState } from "react";

export default function DemoFun(){
    
    const [counter, setcounter]= useState(0);


   
    return(
        <div className="flex ">
            <div className="w-full h-full bg-red-100 mt-20">

        <p>
            current count :{counter}
        </p>
                <button onClick={()=>setcounter(c=>c+1)}>increase counter</button>
                <button onClick={()=>setcounter(c=>c-1)}>decrease counter</button>
            </div>
        </div>
    )
}