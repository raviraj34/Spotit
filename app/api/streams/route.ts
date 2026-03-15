import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/app/lib/db";
import z from "zod";
const YT_REGEX = new RegExp("^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$")
const CreateStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string()
})
export async function POST(req: NextRequest
) {
    try {
        const data = CreateStreamSchema.parse(await req.json());
        const isYT = YT_REGEX.test(data.url);

        if (!isYT) {
            return NextResponse.json({
                message: "wrong url format"
            }, {
                status: 411
            })
        }
        const extractedId = data.url.split("?v=")[1];

       await prismaClient.stream.create({
            data: {
                extractedId,
                userId: data.creatorId,
                url: data.url,
                type: "Youtube"
            }
        })
    } catch (e) {
        return NextResponse.json({
            message: "error while adding stream"
        },{
            status: 411
        })
    }
}

