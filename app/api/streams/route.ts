import { NextRequest, NextResponse } from "next/server";
import { prismaClient, PrismaClient } from "@/app/lib/db";
import z from "zod";
const YT_REGEX = new RegExp(^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$)
const CreateStreamSchema = z.object({
    creatorId : z.string(),
    url :z.string()
})
export async function  POST(req: NextRequest
){
    try{
        const data= CreateStreamSchema.parse(await req.json());
        const isYT = data.url.includes("youtube");

        prismaClient.stream.create({
            userId:data.createId,
            url:data.url
        })

    }catch(e){
        return NextResponse.json({
            message:"error while adding stream "
        },{
            status:411
        })
    }
}
