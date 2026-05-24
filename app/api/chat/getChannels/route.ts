import { getChannelList } from "@/server/chatDB";
import getCORSHeaders from "@/app/api/cors";
import { chatDisabledResponse } from "@/lib/chatApiGuard";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const disabled = chatDisabledResponse(req, 'getChannels');
    if (disabled) return disabled;

    try {
        const channels = await getChannelList();
        return Response.json(channels, {
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
