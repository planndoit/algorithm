-- Separate reusable content records from scheduled ten-question publications.
alter table public.contents add column account_url text not null default '' check (account_url='' or account_url ~ '^https://');
alter table public.contents add column collection_method text not null default 'manual' check (collection_method in ('manual','ai','sample'));
alter table public.quiz_sets add column is_sample boolean not null default false;
create index contents_review on public.contents(status,category,created_at desc);
create or replace function public.guard_quiz() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then if old.locked then raise exception 'Published quizzes are immutable';end if;return old;end if;
 if tg_op='UPDATE' and old.locked and (new.title<>old.title or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.locked=false or new.is_sample<>old.is_sample or new.status='draft') then raise exception 'Published quizzes are immutable';end if;
 if new.status='published' and not new.locked then
  if (select count(*) from public.quiz_questions where quiz_id=new.id)<>10 then raise exception 'Exactly 10 questions required';end if;
  if exists(select 1 from public.quiz_questions q join public.contents c on c.id=q.content_id where q.quiz_id=new.id and c.status<>'approved') then raise exception 'Approved content required';end if;
  -- Refresh public snapshots at publication; exclude all private fields.
  update public.quiz_questions q set snapshot=jsonb_build_object('id',c.id,'title',c.title,'category',c.category,'platform',c.platform,'creator',c.creator,'source_url',c.source_url,'thumbnail_url',c.thumbnail_url,'description',c.description,'account_url',c.account_url,'is_sample',c.collection_method='sample') from public.contents c where q.quiz_id=new.id and q.content_id=c.id;
  new.is_sample:=exists(select 1 from public.quiz_questions q join public.contents c on c.id=q.content_id where q.quiz_id=new.id and c.collection_method='sample');
  new.locked=true;
 end if;return new;
end $$;
create or replace function public.save_quiz(p_id uuid,p_title text,p_start timestamptz,p_end timestamptz,p_contents uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare q uuid; c record; i integer:=0;
begin
 if cardinality(p_contents)>10 then raise exception 'Too many questions';end if;
 if p_id is null then insert into public.quiz_sets(title,starts_at,ends_at) values(p_title,p_start,p_end) returning id into q;
 else select id into q from public.quiz_sets where id=p_id and status='draft' and not locked for update;if q is null then raise exception 'Draft not found';end if; update public.quiz_sets set title=p_title,starts_at=p_start,ends_at=p_end where id=q;delete from public.quiz_questions where quiz_id=q;end if;
 foreach p_id in array p_contents loop
  select * into c from public.contents where id=p_id and status='approved';if not found then raise exception 'Approved content required';end if;
  insert into public.quiz_questions values(q,c.id,i,jsonb_build_object('id',c.id,'title',c.title,'category',c.category,'platform',c.platform,'creator',c.creator,'source_url',c.source_url,'thumbnail_url',c.thumbnail_url,'description',c.description,'account_url',c.account_url,'is_sample',c.collection_method='sample'));i:=i+1;
 end loop;
 update public.quiz_sets set is_sample=exists(select 1 from public.contents where id=any(p_contents) and collection_method='sample') where id=q;
 return q;
end $$;
insert into public.schema_migrations(version) values ('002_admin_workflow');
