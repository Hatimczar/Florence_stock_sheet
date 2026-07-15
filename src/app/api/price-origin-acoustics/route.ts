import { createListRouteHandlers } from '@/lib/listRouteHandlers';

export const dynamic = 'force-dynamic';
export const { GET, POST, PATCH, DELETE } = createListRouteHandlers('price_origin_acoustics');
