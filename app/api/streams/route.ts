import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/app/lib/db";
import z from "zod";
import youtubesearchapi from "youtube-search-api";
const YT_REGEX = /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;
const CreateStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string()
})
export async function POST(req: NextRequest
) {
    try {
        const data = CreateStreamSchema.parse(await req.json());
        const isYT = data.url.match(YT_REGEX)


        if (!isYT) {
            return NextResponse.json({
                message: "wrong url format"
            }, {
                status: 411
            })
        }
        const extractedId = data.url.split("?v=")[1];

       const stream =await prismaClient.stream.create({
            data: {
                extractedId,
                userId: data.creatorId,
                url: data.url,
                type: "Youtube"
            }
        })
        return NextResponse.json({
            message:"added stream",
            id: stream.id
        })
    } catch (e) {
        return NextResponse.json({
            message: "error while adding stream"
        },{
            status: 411
        })
    }
}

