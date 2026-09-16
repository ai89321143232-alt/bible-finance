import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { goalId } = await req.json();
    if (!goalId) return Response.json({ error: 'goalId is required' }, { status: 400 });

    const goal = await base44.entities.Goal.get(goalId);
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 });

    const uris = (goal.photo_uris || []).slice(0, 10);
    const urls = await Promise.all(uris.map(async (fileUri) => {
      const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 });
      return result.signed_url;
    }));

    return Response.json({ urls });
  } catch (error) {
    console.error('signGoalPhotos error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}