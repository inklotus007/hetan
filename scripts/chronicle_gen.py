#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""判定者执笔：每天一篇村志（GitHub Actions每晚0点跑）。
   读villagers.json（婚育命定表）+chronicle.json（已有章节），
   按今天的日子收事件（婚礼/出生/成年/日常），调GLM写章，追加落盘。
   模型优先glm-4.7-flash，429降glm-4-flash（都免费）。"""
import json, urllib.request, urllib.error, time, sys
import env_snapshot

V = json.load(open('villagers.json'))
try:
    M = json.load(open('villagers_memory.json'))
    _talks = (M.get('today') or {}).get('talks') or []
    talks_txt = ('今天村里的话（写章时可以化进来，让章里有对话）：' + '；'.join('%s对%s说「%s」' % (t.get('a'), t.get('b'), t.get('text')) for t in _talks[:4])) if _talks else ''
except Exception:
    talks_txt = ''
C = json.load(open('chronicle.json'))
UP = V['up']
now = int(time.time() * 1000)
day = int((now - UP) / 86400000)
chapters = C['chapters']

ENV = env_snapshot.build(V, day)
RY = env_snapshot.rhythm()
if any(ch.get('day') == day for ch in chapters):
    print('第%d日已写过，跳过' % day)
    sys.exit(0)

events = []
for wd in V.get('weddings', []):
    if wd['day'] == day:
        events.append('今天成亲：%s和%s（两家已摆红花、立了喜牌）' % (V['homes'][wd['a']]['name'], V['homes'][wd['b']]['name']))
for c in V.get('children', []):
    sexn = '男娃' if c['sex'] == 'M' else '女娃'
    if c['bornDay'] == day:
        events.append('今天生了%s，取名「%s」' % (sexn, c['name']))
    if c['adultDay'] == day:
        events.append('「%s」今天成年，要在部落外围自己的宅地上盖房了（年轻人盖得慢）' % c['name'])

kids = '、'.join(c['name'] for c in V.get('children', []))
kids_days = '；'.join('%s生@第%d天成年@第%d天' % (c['name'], c['bornDay'], c['adultDay']) for c in V.get('children', []))

today_desc = ('今日大事：' + '；'.join(events)) if events else '今天村里没有大事——写日常：谁家房顶又上了一层、火塘边谁说了什么、天好天坏、孩子们绕着火塘跑。'

prompt = """你是河滩世界村志的记史人。这个世界是3D像素村庄，两个部落安家在世界中部，村心各一堆火，九户村民，房屋按晴日进度慢慢盖，下雨停工。
命定事实：九户=满仓、建军（单身）、秋生、秀兰、凤兰、爱香、长贵、来福、银锁。婚事：满仓配凤兰第4天、秋生配秀兰第7天、来福配爱香第7天、长贵配银锁第16天。孩子名册：%s（%s）——都还没出生（各自出生日见括号），别写他们出场。
今天是安家后第%d天。%s
%s
今天这一章，标题自拟（四字内，不带「第」字），要像村里人讲村里事，不要列清单，不要元叙述（不说「命运」「预示」这类话），落款「——村志 第%d日」。
今天的处境（写章的事实依据，别编）：
%s
%s
用话本体写今天这一章，250字以内。**没有大事的日子就写短**（两三句，80字内，贴着今天的进度/天气/话）；实在无事可写，返回 {"title":"","text":"","skip":true} 跳过今天（空章比编出来的章好）。
只输出JSON：{"title":"...","text":"...","skip":false}。""" % (kids, kids_days, day, today_desc, talks_txt, day, ENV, RY)

def call(model):
    # max_tokens 1024：4.7-flash带思考链，800可能全花在思考上（finish=length content空——10/25实测）
    body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 1024, 'temperature': 0.85}).encode()
    req = urllib.request.Request('https://open.bigmodel.cn/api/paas/v4/chat/completions', data=body,
        headers={'Authorization': 'Bearer ' + os.environ['ZHIPU_KEY'], 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=90))
    ch = r['choices'][0]
    c = ((ch.get('message') or {}).get('content') or '').strip()
    if not c:
        raise RuntimeError('empty finish=%s' % ch.get('finish_reason'))
    return c

import os
txt = None
try:
    txt = call('glm-4.7-flash')
except urllib.error.HTTPError as e:
    if e.code == 429:
        print('4.7-flash限流，降4-flash')
        txt = call('glm-4-flash')
    else:
        raise
except RuntimeError as e:
    print('4.7-flash空答(%s)，降4-flash' % str(e)[:50])
    txt = call('glm-4-flash')

txt = txt.strip()
try:
    j = json.loads(txt[txt.index('{'): txt.rindex('}') + 1])
    title, text = j['title'][:8], j['text']
    if j.get('skip') and not text:
        print('判定者说今天无事，跳过写章（空章比编出来的章好）')
        sys.exit(0)
except Exception:
    title, text = '第%d日' % day, txt

chapters.append({'n': len(chapters) + 1, 'title': title, 'date': time.strftime('%Y-%m-%d'), 'day': day, 'text': text})
json.dump(C, open('chronicle.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('wrote 第%d日《%s》' % (day, title))
