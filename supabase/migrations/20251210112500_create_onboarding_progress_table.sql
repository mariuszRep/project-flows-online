-- Create trigger function for updating updated_at
create or replace function update_onboarding_progress_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create onboarding_progress table to track user onboarding state
create table public.onboarding_progress (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  wizard_step integer not null default 1,
  selected_plan_id text null,
  selected_plan_name text null,
  selected_plan_interval text null,
  organization_id uuid null,
  payment_completed boolean not null default false,
  email_verified boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint onboarding_progress_pkey primary key (id),
  constraint onboarding_progress_user_id_key unique (user_id),
  constraint onboarding_progress_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint onboarding_progress_organization_id_fkey foreign key (organization_id) references public.organizations (id) on delete set null,
  constraint onboarding_progress_wizard_step_check check (wizard_step >= 1 and wizard_step <= 7)
);

-- Create index for performance
create index IF not exists idx_onboarding_progress_user_id on public.onboarding_progress using btree (user_id);

-- Create trigger to auto-update updated_at
create trigger update_onboarding_progress_updated_at
before update on public.onboarding_progress
for each row
execute function update_onboarding_progress_updated_at();

-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read/write their own onboarding progress
CREATE POLICY "Users can view own onboarding progress" ON public.onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress" ON public.onboarding_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress" ON public.onboarding_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.onboarding_progress TO authenticated;
GRANT SELECT ON public.onboarding_progress TO service_role;
