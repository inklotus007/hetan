#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""村里人答话：TA在游戏里对村民说话 → talk_queue.json（push触发本workflow）
   判定者（GLM）按该村民的人设和村况回话 → replies.json → 前端轮询显示。
   「村里人想好了才答话」——异步，延迟1-2分钟。
   并发说明：TA连说两句可能两个run并发——答重了前端按id去重，不做锁。"""
import json, urllib.request, urllib.error, time, os, sys

V = json.load(open('villagers.json'))
Q = json.load(open('talk_queue.json'))
C = json.load(open('chronicle.json'))
try:
    R = json.load(open('replies.json'))
    if 'replies' not in R: R = {'replies': []}
except Exception:
    R = {'replies': []}

if not Q:
    print('queue空，退出')
    sys.exit(0)

# 九户人设：婚育命定+性格底稿（1990年代豫北，话短实在，不书面）
PERS = {
 '满仓': '四十来岁，最早张罗安家的，实诚话短，天天看日头算婚期（第4天娶凤兰），操心盖房',
 '建军': '二十七八，光棍，独门独院，话冲心软，谁家有活都搭手',
 '秀兰': '三十来岁，利落眼睛毒，看材料一眼估出数（第7天嫁秋生）',
 '凤兰': '三十来岁，热肠爱张罗，锅里总给人留着（第4天嫁满仓）',
 '秋生': '三十来岁，手巧木工，话不多，干活的时候哼梆子（第7天娶秀兰）',
 '爱香': '三十来岁，爽利嗓门亮（第7天嫁来福）',
 '长贵': '四十来岁，营地的老大哥，稳当话慢（第16天娶银锁）',
 '来福': '三十来岁，勤快，天不亮就起（第7天娶爱香）',
 '银锁': '三十来岁，精细，账算得清（第16天嫁长贵）',
}

day = int((time.time() * 1000 - V['up']) / 86400000)
recent = C.get('chapters', [])[-2:]
recent_txt = ' '.join((ch.get('text') or '')[:150] for ch in recent)

replied = []
failed = []
for item in Q:
    npc = (item.get('npc') or '').strip()
    who = (item.get('name') or '客').strip()[:20]
    text = (item.get('text') or '').strip()[:300]
    if not npc or not text:
        continue
    pers = PERS.get(npc, '村里人，实在')
    hist = [r for r in R['replies'] if r.get('npc') == npc][-2:]
    hist_txt = '\n'.join('（此前你跟%s说过）你对%s说过「%s」，TA答过「%s」' % (r.get('name'), r.get('name'), (r.get('text') or '')[:60], (r.get('reply') or '')[:60]) for r in hist) or '（还没跟TA说过话）'
    prompt = """你是河滩村的村民「%s」。%s。
村子现状（安家第%d天）：九户在河滩和营地两边盖房，婚事都定了：满仓配凤兰第4天、秋生配秀兰第7天、来福配爱香第7天、长贵配银锁第16天，建军单身。最近村里的事：%s
%s
现在%s（村里能看见的一个人，大家当稀客处，不当外人）对你说：「%s」
你回一段话——豫北庄稼人口吻，实在，30到80字，不书面，不解释自己是村民，不提AI不提游戏。可以问回去一句。
只输出回话本身，不要引号不要前缀。""" % (npc, pers, day, recent_txt[:250], hist_txt, who, text)

    def call(model):
        # max_tokens 1024：4.7-flash带思考链，200全花在思考上（finish=length content空——10/25端到端实测）
        body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 1024, 'temperature': 0.9}).encode()
        req = urllib.request.Request('https://open.bigmodel.cn/api/paas/v4/chat/completions', data=body,
            headers={'Authorization': 'Bearer ' + os.environ['ZHIPU_KEY'], 'Content-Type': 'application/json'})
        r = json.load(urllib.request.urlopen(req, timeout=90))
        ch = r['choices'][0]
        c = ((ch.get('message') or {}).get('content') or '').strip()
        if not c:
            raise RuntimeError('empty finish=%s' % ch.get('finish_reason'))
        return c

    try:
        try:
            reply = call('glm-4.7-flash')
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print('4.7-flash限流，降4-flash')
                reply = call('glm-4-flash')
            else:
                raise
        except RuntimeError as e:
            print('4.7-flash空答(%s)，降4-flash' % str(e)[:50])
            reply = call('glm-4-flash')
    except Exception as e:
        print('答话失败(%s)：%s——留在queue' % (npc, str(e)[:60]))
        failed.append(item.get('id'))
        continue   # 失败的留在queue，下个run再答
    replied.append({'id': item.get('id'), 'npc': npc, 'name': who, 'text': text, 'reply': reply[:200], 'rt': int(time.time() * 1000)})
    print('%s答了：%s' % (npc, reply[:40]))

if replied:
    R['replies'].extend(replied)
    R['replies'] = R['replies'][-300:]
json.dump(R, open('replies.json', 'w'), ensure_ascii=False)
json.dump([q for q in Q if q.get('id') in failed], open('talk_queue.json', 'w'), ensure_ascii=False)   # 成功的清掉，失败的留队
print('done', len(replied), 'failed', len(failed))
