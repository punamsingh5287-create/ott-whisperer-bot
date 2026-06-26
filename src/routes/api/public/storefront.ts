import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/storefront')({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const [{ data: categories }, { data: products }] = await Promise.all([
          supabaseAdmin.from('categories').select('id,name,icon_emoji,premium_emoji_id,sort_order').eq('is_active', true).order('sort_order'),
          supabaseAdmin.from('products').select('id,name,description,price,duration_days,stock,image_url,category_id,status').eq('status', 'active').order('created_at', { ascending: false }),
        ]);
        return Response.json(
          { categories: categories ?? [], products: products ?? [] },
          { headers: { 'Cache-Control': 'public, max-age=30' } },
        );
      },
    },
  },
});
