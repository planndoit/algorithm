-- Failed provider connections should be retryable after configuration changes.
-- Successful/manual runs retain the ten-minute cooldown; active leases always block.
create or replace function public.claim_collection(p_key text,p_trigger text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(377025,1);
 update public.collection_runs set status='failed',finished_at=now(),error='실행 시간 초과: 다음 실행에서 재수집합니다.' where status='running' and started_at<now()-interval '10 minutes';
 if exists(select 1 from public.collection_runs where status='running' or (status<>'failed' and started_at>now()-interval '10 minutes') or (status='failed' and started_at>now()-interval '1 minute')) then return null;end if;
 insert into public.collection_runs(run_key,trigger) values(p_key,p_trigger) on conflict(run_key) do nothing returning id into result;
 return result;
end $$;
revoke execute on function public.claim_collection(text,text) from public;
insert into public.schema_migrations(version) values('004_collection_retry');
