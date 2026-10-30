alter table public.collection_settings add column instagram_hashtags text[] not null default array['밈','릴스','챌린지'];
alter table public.collection_settings add column instagram_min_likes integer not null default 100 check(instagram_min_likes between 1 and 10000000);
alter table public.collection_observations drop constraint collection_observations_provider_check;
alter table public.collection_observations add constraint collection_observations_provider_check check(provider in ('bluesky','youtube','instagram'));
-- Reserve before requesting Meta: the account has a rolling unique hashtag quota.
create table public.instagram_hashtag_usage(account_id text not null,hashtag text not null,last_requested_at timestamptz not null default now(),primary key(account_id,hashtag));
create table public.collection_provider_checks(provider text primary key,status text not null,checked_at timestamptz not null default now(),message text not null,account_name text not null default '');
alter table public.instagram_hashtag_usage enable row level security;
alter table public.collection_provider_checks enable row level security;
revoke all on public.instagram_hashtag_usage,public.collection_provider_checks from public;
create function public.reserve_instagram_hashtags(p_account text,p_tags text[]) returns boolean language plpgsql security invoker set search_path='' as $$
declare used integer;needed integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_account,377026));
 select count(*) into used from public.instagram_hashtag_usage where account_id=p_account and last_requested_at>now()-interval '7 days';
 select count(*) into needed from (select distinct unnest(p_tags) tag) t where not exists(select 1 from public.instagram_hashtag_usage u where u.account_id=p_account and u.hashtag=t.tag and u.last_requested_at>now()-interval '7 days');
 if used+needed>30 then return false;end if;
 insert into public.instagram_hashtag_usage(account_id,hashtag) select p_account,tag from (select distinct unnest(p_tags) tag) t on conflict(account_id,hashtag) do update set last_requested_at=now();
 return true;
end $$;
revoke execute on function public.reserve_instagram_hashtags(text,text[]) from public;
insert into public.schema_migrations(version) values('005_instagram_collection');
