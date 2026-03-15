import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import {z} from "zod";

const UpvoteSchema= z.object({
    streamId:z.string(),
})
export async function POST(req:NextRequest,res:NextResponse){
const session = await getServerSession();

const user = await prismaClient.user.findFirst({
    where:{
        email:session?.user?.email ?? ""
    }
});

if(!user){
    return NextResponse.json({
        message:"unauthenticated request"
    },{
        status:403
    })
}
 try{
    const data=UpvoteSchema.parse(await req.json());
    await prismaClient.upvote.create({
        data:{
            userId:user.id,
            streamId: data.streamId
        }
    });
 } catch(e){
    return NextResponse.json({
        message:"Unauthenticated"
    },{
        status: 403
    })

 }
}

export async function GET(req:NextRequest){
    const creatorId  =req.nextUrl.searchParams.get("creatorId");
    const streams = await prismaClient.stream.findMany({
        where:{
            userId:creatorId ?? ""
        }
    })
    return NextResponse.json({
        streams
    })
}