-- Explicitly fictional UI fixtures requested by the operator. Not real trends.
-- Safe to rerun: a seed marker prevents duplicate records or changed periods.
do $$
declare ids uuid[]:='{}';c uuid;q uuid;i integer;base timestamptz:=date_trunc('hour',now());
 titles text[]:=array['[샘플] 크리에이터 소개 카드','[샘플] 짧은 반응 밈','[샘플] 한 줄 유행어','[샘플] 동작 따라 하기 챌린지','[샘플] 짧은 영상 콘텐츠','[샘플] 음악 크리에이터 카드','[샘플] 일상 공감 밈','[샘플] 댓글 유행어','[샘플] 리듬 챌린지','[샘플] 화제 콘텐츠 카드','[샘플] 검토 대기 인물 카드','[샘플] 검토 대기 밈 카드','[샘플] 검토 대기 영상 카드','[샘플] 제외된 중복 후보'];
 kinds text[]:=array['인물','밈','유행어','챌린지','화제 콘텐츠'];
 platforms text[]:=array['Instagram','TikTok','Threads','TikTok','YouTube'];
begin
 if exists(select 1 from public.schema_migrations where version='seed_admin_samples_v1') then return;end if;
 for i in 1..14 loop
  insert into public.contents(title,creator,account_url,source_url,discovered_at,trending_at,category,platform,difficulty,description,admin_notes,status,collection_method)
  values(titles[i],'테스트용 크리에이터 '||lpad(i::text,2,'0'),'https://example.com/accounts/sample-'||i,'https://example.com/algorithm-samples/content-'||i,(now() at time zone 'Asia/Seoul')::date-(i%4),case when i%3=0 then null else (now() at time zone 'Asia/Seoul')::date-7 end,kinds[((i-1)%5)+1],platforms[((i-1)%5)+1],(array['쉬움','보통','어려움'])[((i-1)%3)+1],
   '기능 확인용 샘플입니다. 실제 인물·계정·트렌드 정보가 아닙니다. 등록, 검토, 문제 선택과 발행 흐름을 테스트해 보세요.',
   '사용자 요청으로 등록한 샘플. example.com 주소는 예시 링크입니다. 실제 콘텐츠 등록 시 교체해 주세요.',case when i<=10 then 'approved' when i<=13 then 'pending' else 'excluded' end,'sample') returning id into c;
  ids:=array_append(ids,c);
 end loop;
 q:=public.save_quiz(null,'[샘플] 지금 노출되는 테스트 회차',base-interval '1 hour',base+interval '7 days',ids[1:10]);
 update public.quiz_sets set status='published' where id=q;
 q:=public.save_quiz(null,'[샘플] 다음 주 예약 회차',base+interval '7 days',base+interval '14 days',array[ids[10],ids[9],ids[8],ids[7],ids[6],ids[5],ids[4],ids[3],ids[2],ids[1]]);
 update public.quiz_sets set status='published' where id=q;
 q:=public.save_quiz(null,'[샘플] 편집해 볼 임시저장 회차',base+interval '14 days',base+interval '21 days',ids[3:8]);
 insert into public.schema_migrations(version) values('seed_admin_samples_v1');
end $$;
