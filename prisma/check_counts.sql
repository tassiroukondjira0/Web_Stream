SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'medias', count(*) FROM medias
UNION ALL SELECT 'provider_assets', count(*) FROM provider_assets
UNION ALL SELECT 'subscriptions', count(*) FROM subscriptions
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'bookmarks', count(*) FROM bookmarks
UNION ALL SELECT 'watch_histories', count(*) FROM watch_histories
UNION ALL SELECT 'categories', count(*) FROM categories
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'reviews', count(*) FROM reviews
UNION ALL SELECT 'wishlist_items', count(*) FROM wishlist_items
UNION ALL SELECT 'playback_progress', count(*) FROM playback_progress
UNION ALL SELECT 'page_views', count(*) FROM page_views
UNION ALL SELECT 'provider_sync_runs', count(*) FROM provider_sync_runs;
