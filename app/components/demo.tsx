"use client"

import { count } from "console";
import { useState } from "react";
import { xid } from "zod";

export default async function Demo(){
    const posts = await getData();
    const [counter, setcounter] = useState(0);
    const number = [1,2,3,4,5]
    const post = [
        {id :1,title:"post 1"},
        {id:2 ,title:"post 2"}
    ]
    function increment(){
        setcounter(c=>c+1)
    }

    function decrement(){
        setcounter(c=>c-1)
    }

    async function getData(){
        const res= await fetch("https://jsonplaceholder.typicode.com/posts");

        return res.json();
    }

    return (
        <div>
                current count :{counter}
                <button onClick={()=>increment()}>increment</button>
                <button onClick={()=>decrement()}>decrement</button>


        {post.map((post)=>(
            <div key={post.id}>
                <p>{post.title}</p>
            </div>
        ))}



            {posts.slice(0,5).map((post:any) =>(
                <p key={post.id}>{post.title}</p>
            ))}
                <div>
                    {number.map((num)=>(
                        <p key={num}> {num}</p>
                    ))}

                    {post.map((post)=>(
                        <div key={post.id}>
                            <h2>{post.title}</h2>
                        </div>
                    ))} 
                </div>
                {number.map((num)=>(
                    <p key={num}>{num}</p>
                ))}
        </div>
    )
}