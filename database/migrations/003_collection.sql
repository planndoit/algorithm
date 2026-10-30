alter table public.contents drop constraint contents_collection_method_check;
alter table public.contents add constraint contents_collection_method_check check(collection_method in ('manual','ai','sample','auto'));
create table public.collection_settings(
 id boolean primary key default true check(id), enabled boolean not null default true,
 keywords text[] not null default array['밈','챌린지','유행어','쇼츠'],
 daily_limit integer not null default 20 check(daily_limit between 1 and 50),
 bluesky_min_engagement integer not null default 30 check(bluesky_min_engagement between 1 and 10000),
 youtube_min_views integer not null default 10000 check(youtube_min_views between 100 and 100000000),
 updated_at timestamptz not null default now()
);
insert into public.collection_settings(id) values(true);
create table public.collection_runs(
 id uuid primary key default gen_random_uuid(),run_key text not null unique,
 trigger text not null check(trigger in ('cron','manual')),status text not null default 'running' check(status in ('running','succeeded','partial','failed','skipped')),
 started_at timestamptz not null default now(),finished_at timestamptz,
 found_count integer not null default 0,inserted_count integer not null default 0,duplicate_count integer not null default 0,
 source_results jsonb not null default '[]',error text not null default ''
);
create index collection_runs_recent on public.collection_runs(started_at desc);
create unique index collection_one_running on public.collection_runs(status) where status='running';
create table public.collection_observations(
 content_id uuid primary key references public.contents(id),provider text not null check(provider in ('bluesky','youtube')),
 external_id text not null,run_id uuid not null references public.collection_runs(id),
 published_at timestamptz not null,first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),
 score double precision not null,metrics jsonb not null,previous_metrics jsonb,reason text not null,
 unique(provider,external_id)
);
create index collection_observations_first on public.collection_observations(first_seen_at);
alter table public.collection_settings enable row level security;
alter table public.collection_runs enable row level security;
alter table public.collection_observations enable row level security;
revoke all on public.collection_settings,public.collection_runs,public.collection_observations from public;
create function public.claim_collection(p_key text,p_trigger text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(377025,1);
 update public.collection_runs set status='failed',finished_at=now(),error='실행 시간 초과: 다음 실행에서 재수집합니다.' where status='running' and started_at<now()-interval '10 minutes';
 if exists(select 1 from public.collection_runs where started_at>now()-interval '10 minutes') then return null;end if;
 insert into public.collection_runs(run_key,trigger) values(p_key,p_trigger) on conflict(run_key) do nothing returning id into result;
 return result;
end $$;
revoke execute on function public.claim_collection(text,text) from public;
insert into public.schema_migrations(version) values('003_collection');
create function public.ingest_collection(p_run uuid,p_candidates jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb;cid uuid;fresh boolean;added integer:=0;duplicates integer:=0;remaining integer;day_start timestamptz;stamp timestamptz:=now();
begin
 perform pg_advisory_xact_lock(377025,1);
 if not exists(select 1 from public.collection_runs where id=p_run and status='running' and started_at>now()-interval '10 minutes') then raise exception 'Run not active';end if;
 day_start:=date_trunc('day',stamp at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 select greatest(0,s.daily_limit-(select count(*)::int from public.collection_observations where first_seen_at>=day_start)) into remaining from public.collection_settings s where id=true;
 for c in select value from jsonb_array_elements(p_candidates) loop
  cid:=null;fresh:=false;
  select content_id into cid from public.collection_observations where provider=c->>'provider' and external_id=c->>'external_id';
  if cid is null then select id into cid from public.contents where source_url=c->>'source_url';end if;
  if cid is null then
   if remaining<=0 then continue;end if;
   insert into public.contents(title,creator,account_url,source_url,description,category,platform,discovered_at,metrics,admin_notes,collection_method,status)
   values(c->>'title',c->>'creator',c->>'account_url',c->>'source_url',c->>'description',c->>'category',c->>'platform',(stamp at time zone 'Asia/Seoul')::date,(c->'metrics')::text,'자동 수집 후보입니다. 원문·반응 지표를 확인하고 제목·유형·난이도·유행 시작일을 검토해 주세요. 게시일을 유행 시작일로 간주하지 않습니다.','auto','pending') on conflict(source_url) do nothing returning id into cid;
   if cid is not null then fresh:=true;remaining:=remaining-1;added:=added+1;
   else select id into cid from public.contents where source_url=c->>'source_url';end if;
  end if;
  if not fresh then duplicates:=duplicates+1;end if;
  insert into public.collection_observations(content_id,provider,external_id,run_id,published_at,score,metrics,reason)
  values(cid,c->>'provider',c->>'external_id',p_run,(c->>'published_at')::timestamptz,(c->>'score')::double precision,c->'metrics',c->>'reason')
  on conflict(content_id) do update set previous_metrics=public.collection_observations.metrics,metrics=excluded.metrics,score=excluded.score,reason=excluded.reason,last_seen_at=stamp,run_id=p_run;
 end loop;
 return jsonb_build_object('inserted',added,'duplicates',duplicates);
end $$;
revoke execute on function public.ingest_collection(uuid,jsonb) from public;
