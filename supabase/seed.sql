-- Seed data for development and testing
-- This file is loaded after migrations during db reset

-- Insert default roles
-- These roles are global (org_id is NULL) and can be assigned to users in any organization
INSERT INTO "public"."roles" ("id", "name", "description", "permissions", "org_id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by") VALUES
  ('35fca4d9-4ec4-481c-8b8a-afb3aab97d96', 'owner', 'Organization owner with full administrative privileges including delete capabilities', '["create", "read", "update", "delete"]', null, now(), now(), null, null, null),
  ('05f47427-7742-46cc-b772-acc30e7ef543', 'admin', 'Administrator with create, read, and update privileges but cannot delete resources', '["create", "read", "update"]', null, now(), now(), null, null, null),
  ('1d3b75e7-cdeb-4329-b78b-bf050ce6863f', 'member', 'Team member with read and update privileges but cannot create or delete resources', '["read", "update"]', null, now(), now(), null, null, null),
  ('09083618-d8f7-487a-959d-e8ad4f2bd542', 'user', 'Basic user with read-only access to authorized resources', '["read"]', null, now(), now(), null, null, null)
ON CONFLICT (id) DO NOTHING;
