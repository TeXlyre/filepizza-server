import { NextResponse } from 'next/server'
import { getOrCreateChannelRepo } from '../../../../channel'

const normalizeSlug = (rawSlug: string | string[]): string => {
    return typeof rawSlug === 'string' ? rawSlug : rawSlug.join('/')
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
    const { slug: rawSlug } = await params
    const slug = normalizeSlug(rawSlug)

    const channel = await getOrCreateChannelRepo().fetchChannel(slug)

    if (!channel) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    return NextResponse.json({
        longSlug: channel.longSlug,
        shortSlug: channel.shortSlug,
        uploaderPeerID: channel.uploaderPeerID,
        sharedSlug: channel.sharedSlug,
        additionalUploaders: channel.additionalUploaders ?? [],
    })
}