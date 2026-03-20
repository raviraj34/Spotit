import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/app/lib/db";
import z from "zod";
import youtubesearchapi from "youtube-search-api";

const YT_REGEX =
  /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const data = CreateStreamSchema.parse(await req.json());

    const match = data.url.match(YT_REGEX);

    if (!match) {
      return NextResponse.json(
        { message: "wrong url format" },
        { status: 400 }
      );
    }

    const extractedId = match[1];

    const res = await youtubesearchapi.GetVideoDetails(extractedId);

    const thumbnails =
      res?.thumbnail?.thumbnails ??
      res?.thumbnail?.thambnails ??
      [];

    thumbnails.sort(
      (a: { width: number }, b: { width: number }) => a.width - b.width
    );

    const smallImg =
      thumbnails.length > 1
        ? thumbnails[thumbnails.length - 2]?.url
        : thumbnails[thumbnails.length - 1]?.url;

    const bigImg = thumbnails[thumbnails.length - 1]?.url;

    const stream = await prismaClient.stream.create({
      data: {
        extractedId,
        userId: data.creatorId,
        url: data.url,
        type: "Youtube",
        title: res?.title ?? "cannot find the title.",
        smallImg: smallImg ?? "cannot find image",
        bigImg: bigImg ?? "cannot find image",
      },
    });

    return NextResponse.json({
      message: "added stream",
      id: stream.id,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { message: "error while adding stream" },
      { status: 500 }
    );
  }
}