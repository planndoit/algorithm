create extension if not exists btree_gist;
create table public.admin_users(id text primary key);
create table public.contents(
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 200),category text not null,platform text not null,creator text not null default '',
 source_url text not null unique check(source_url ~ '^https://'), video_url text not null default '',thumbnail_url text not null default '',description text not null default '',
 discovered_at date not null default current_date,trending_at date,metrics text not null default '',difficulty text not null default '보통',
 status text not null default 'pending' check(status in ('pending','approved','excluded','inactive')),admin_notes text not null default '',created_at timestamptz not null default now()
);
create table public.quiz_sets(id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',starts_at timestamptz not null,ends_at timestamptz not null,status text not null default 'draft' check(status in ('draft','published','ended')),locked boolean not null default false,created_at timestamptz not null default now(),check(ends_at>starts_at),exclude using gist(tstzrange(starts_at,ends_at,'[)') with &&) where(status='published'));
create table public.quiz_questions(quiz_id uuid not null references public.quiz_sets(id),content_id uuid not null references public.contents(id),position integer not null check(position between 0 and 9),snapshot jsonb not null,primary key(quiz_id,position),unique(quiz_id,content_id));
create index quiz_questions_content on public.quiz_questions(content_id);
create table public.quiz_results(id uuid primary key default gen_random_uuid(),quiz_id uuid not null references public.quiz_sets(id),request_id uuid not null unique,actor_hash text not null,score integer not null check(score between 0 and 100 and score%10=0),answers boolean[] not null check(cardinality(answers)=10),created_at timestamptz not null default now());
create index quiz_results_actor on public.quiz_results(actor_hash,created_at);
create index quiz_results_quiz on public.quiz_results(quiz_id,created_at);
create table public.quiz_answers(result_id uuid not null references public.quiz_results(id),position integer not null,known boolean not null,primary key(result_id,position));
create table public.analytics_events(id bigint generated always as identity primary key,quiz_id uuid references public.quiz_sets(id),event text not null,created_at timestamptz not null default now());
create index analytics_events_quiz on public.analytics_events(quiz_id,created_at);
-- Neon: no Data API enabled. Credentials remain server-only. All access is field-selected
-- through application handlers; RLS and revoked PUBLIC privileges deny other roles.
alter table public.admin_users enable row level security;
alter table public.contents enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.analytics_events enable row level security;
revoke all on public.admin_users,public.contents,public.quiz_sets,public.quiz_questions,public.quiz_results,public.quiz_answers,public.analytics_events from public;
create function public.guard_quiz() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then if old.locked then raise exception 'Published quizzes are immutable';end if;return old;end if;
 if tg_op='UPDATE' and old.locked and (new.title<>old.title or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.locked=false or new.status='draft') then raise exception 'Published quizzes are immutable';end if;
 if new.status='published' and not new.locked then
  if (select count(*) from public.quiz_questions where quiz_id=new.id)<>10 then raise exception 'Exactly 10 questions required';end if;
  if exists(select 1 from public.quiz_questions q join public.contents c on c.id=q.content_id where q.quiz_id=new.id and c.status<>'approved') then raise exception 'Approved content required';end if;
  -- Refresh public snapshots at publication; exclude all private fields.
  update public.quiz_questions q set snapshot=jsonb_build_object('id',c.id,'title',c.title,'category',c.category,'platform',c.platform,'creator',c.creator,'source_url',c.source_url,'thumbnail_url',c.thumbnail_url,'description',c.description) from public.contents c where q.quiz_id=new.id and q.content_id=c.id;
  new.locked=true;
 end if;return new;
end $$;
create trigger quiz_guard before insert or update or delete on public.quiz_sets for each row execute function public.guard_quiz();
create function public.guard_questions() returns trigger language plpgsql set search_path='' as $$
declare q uuid;begin
 if tg_op='INSERT' then q=new.quiz_id;else q=old.quiz_id;end if;
 if exists(select 1 from public.quiz_sets where id=q and locked) then raise exception 'Published questions are immutable';end if;
 if tg_op='UPDATE' and new.quiz_id<>old.quiz_id then raise exception 'Cannot move question';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger question_guard before insert or update or delete on public.quiz_questions for each row execute function public.guard_questions();
create function public.save_quiz(p_id uuid,p_title text,p_start timestamptz,p_end timestamptz,p_contents uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare q uuid; c record; i integer:=0;
begin
 if cardinality(p_contents)>10 then raise exception 'Too many questions';end if;
 if p_id is null then insert into public.quiz_sets(title,starts_at,ends_at) values(p_title,p_start,p_end) returning id into q;
 else select id into q from public.quiz_sets where id=p_id and status='draft' and not locked for update;if q is null then raise exception 'Draft not found';end if; update public.quiz_sets set title=p_title,starts_at=p_start,ends_at=p_end where id=q;delete from public.quiz_questions where quiz_id=q;end if;
 foreach p_id in array p_contents loop
  select * into c from public.contents where id=p_id and status='approved';if not found then raise exception 'Approved content required';end if;
  insert into public.quiz_questions values(q,c.id,i,jsonb_build_object('id',c.id,'title',c.title,'category',c.category,'platform',c.platform,'creator',c.creator,'source_url',c.source_url,'thumbnail_url',c.thumbnail_url,'description',c.description));i:=i+1;
 end loop;return q;
end $$;
create function public.submit_result(p_quiz uuid,p_request uuid,p_answers boolean[],p_actor text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;old_result public.quiz_results;total integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into old_result from public.quiz_results where request_id=p_request;
 if found then if old_result.quiz_id<>p_quiz or old_result.answers<>p_answers then raise exception 'Submission already used';end if;return old_result.id;end if;
 if cardinality(p_answers)<>10 or array_position(p_answers,null) is not null then raise exception '10 boolean answers required';end if;
 perform 1 from public.quiz_sets where id=p_quiz and status='published' and starts_at<=now() and ends_at>now() for share;if not found then raise exception 'Quiz unavailable';end if;
 if (select count(*) from public.quiz_questions where quiz_id=p_quiz)<>10 then raise exception 'Invalid quiz';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor,1));
 if (select count(*) from public.quiz_results where actor_hash=p_actor and created_at>now()-interval '1 minute')>=20 then raise exception 'Rate limit';end if;
 -- Global emergency ceiling; edge per-IP limiting should additionally be configured in production.
 if (select count(*) from public.quiz_results where created_at>now()-interval '1 minute')>=300 then raise exception 'Rate limit';end if;
 select count(*)*10 into total from unnest(p_answers) a where a;
 insert into public.quiz_results(quiz_id,request_id,actor_hash,score,answers) values(p_quiz,p_request,p_actor,total,p_answers) returning id into result;
 insert into public.quiz_answers select result,ordinality-1,known from unnest(p_answers) with ordinality a(known,ordinality);
 return result;
end $$;
revoke execute on function public.save_quiz(uuid,text,timestamptz,timestamptz,uuid[]),public.submit_result(uuid,uuid,boolean[],text),public.guard_quiz(),public.guard_questions() from public;
create table public.schema_migrations(version text primary key, applied_at timestamptz not null default now());
alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from public;
insert into public.schema_migrations(version) values ('001_neon_initial');
