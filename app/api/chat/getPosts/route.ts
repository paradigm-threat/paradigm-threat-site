import { getChannelPosts } from "@/server/chatDB";
import getCORSHeaders from "@/app/api/cors";
import { chatDisabledResponse } from "@/lib/chatApiGuard";

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request
) {
    const disabled = chatDisabledResponse(req, 'getPosts');
    if (disabled) return disabled;

    try {
        const { searchParams } = new URL(req.url);
        const channelName = searchParams.get('channel') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!channelName) {
            return Response.json({ error: "Channel name is required" }, {
                status: 400,
                headers: getCORSHeaders(req)
            });
        }

        const posts = await getChannelPosts(channelName, limit);
        return Response.json({
            channel: channelName,
            posts: posts
        }, {
            status: 200,
            headers: getCORSHeaders(req)
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, {
            status: 500,
            headers: getCORSHeaders(req)
        });
    }
}
