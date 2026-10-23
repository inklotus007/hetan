#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""判定者执笔：每天一篇村志（GitHub Actions每晚0点跑）。
   读villagers.json（婚育命定表）+chronicle.json（已有章节），
   按今天的日子收事件（婚礼/出生/成年/日常），调GLM写章，追加落盘。
   模型优先glm-4.7-flash，429降glm-4-flash（都免费）。"""
import json, urllib.request, urllib.error, time, sys

V = json.load(open('villagers.json'))
C = json.load(open('chronicle.json'))
UP = V['up']
now = int(time.time() * 1000)
day = int((now - UP) / 86400000)
chapters = C['chapters']

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
命定事实：九户=满仓、建军（单身）、秋生、秀兰、凤兰、爱香、长贵、来福、银锁。婚事：满仓配凤兰第4天、秋生配秀兰第7天、来福配爱香第7天、长贵配银锁第16天。孩子名册：%s（%s）。
今天是安家后第%d天。%s
用话本体写今天这一章，300字以内，标题自拟（四字内，不带「第」字）。要像村里人讲村里事，不要列清单，不要元叙述（不说「命运」「预示」这类话）。落款「——村志 第%d日」。
只输出JSON：{"title":"...","text":"..."}。""" % (kids, kids_days, day, today_desc, day)

def call(model):
    body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 800, 'temperature': 0.85}).encode()
    req = urllib.request.Request('https://open.bigmodel.cn/api/paas/v4/chat/completions', data=body,
        headers={'Authorization': 'Bearer ' + os.environ['ZHIPU_KEY'], 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=90))

import os
txt = None
try:
    txt = call('glm-4.7-flash')['choices'][0]['message']['content']
except urllib.error.HTTPError as e:
    if e.code == 429:
        print('4.7-flash限流，降4-flash')
        txt = call('glm-4-flash')['choices'][0]['message']['content']
    else:
        raise

txt = txt.strip()
try:
    j = json.loads(txt[txt.index('{'): txt.rindex('}') + 1])
    title, text = j['title'][:8], j['text']
except Exception:
    title, text = '第%d日' % day, txt

chapters.append({'n': len(chapters) + 1, 'title': title, 'date': time.strftime('%Y-%m-%d'), 'day': day, 'text': text})
json.dump(C, open('chronicle.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('wrote 第%d日《%s》' % (day, title))
