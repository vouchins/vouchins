# Removing the Content Importer

The importer is isolated and does not alter the normal feed path. To remove it:

1. Remove `lib/content-importer/`, `app/api/admin/content-importer/`, `components/admin/content-importer-tab.tsx`, and `__tests__/content-importer.test.ts`.
2. Remove the `Download` and `ContentImporterTab` imports, the `content-importer` `TabsTrigger`, and its `TabsContent` from `app/admin/page.tsx`.
3. Apply a new migration that drops `public.accept_content_import_item(uuid, uuid, text, text)`, then drops `public.content_import_items` and `public.content_import_sources` in that order.
4. Keep the original migration in version control as migration history. Do not delete an already-applied migration.

No post schema columns, feed queries, schedules, or external services are specific to this feature.
