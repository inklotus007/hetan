#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""村民的心思：每天第一次被调用时生成——
   ①各户今天的心事（第一人称：答话prompt+前端对话modal用）
   ②今天村里的话（2-4条村民之间的对话：前端「今天村里」+村志引用）
   判重：villagers_memory.json的moodDay==今天则跳过。
   各户对话记忆（mem）由talk_reply.py负责写，本脚本只养心思。"""
import json, urllib.request, time, os, re, sys

V = json.load(open('villagers.json'))
C = json.load(open('chronicle.json'))
try:
    M = json.load(open('villagers_memory.json'))
    if 'minds' not in M: M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}
except Exception:
    M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}

day = int((time.time() * 1000 - V['up']) / 86400000)
if M.get('moodDay') == day:
    print('今天(day %d)的心思已经养过了，跳过' % day)
    sys.exit(0)

names = sorted({vh['name'] for vh in V['homes'].values()})
recent = ' '.join((ch.get('text') or '')[:120] for ch in C.get('chapters', [])[-2:])
mem_txt = []
for n in names:
    m = (M.get('mem') or {}).get(n) or []
    if m:
        mem_txt.append('%s记得的事：%s' % (n, '；'.join('同志说过「%s」他答了「%s」' % ((x.get('text') or '')[:40], (x.get('reply') or '')[:40]) for x in m[-3:])))
mem_block = '\n'.join(mem_txt) if mem_txt else '（同志还没跟谁说过话）'

prompt = """你是河滩村的「意识」——九户村民的心思由你养着。这是安家第%d天。
村子底子（骨架，不许改）：满仓配凤兰第4天娶、秋生配秀兰第7天娶、来福配爱香第7天娶、长贵配银锁第16天娶，建军单身（二十七八，话冲心软）。性格底子：满仓实诚算婚期、秀兰利落眼睛毒、凤兰热肠爱张罗、秋生手巧话少哼梆子、爱香爽利嗓门亮、长贵老大哥稳当话慢、来福天不亮就起、银锁精细账清。
最近村里发生：%s
%s
请生成：
1. 每户今天的心事——第一人称，30到60字，像那人自己在心里过的一天（满仓在数日子、建军看别人成双是什么滋味、银锁盘的是什么账……各是各的，别全是婚礼话题）
2. 今天村里的话——2到4条，谁对谁说的，一句一条（火塘边、门口、地头，贴着上面的事）

只输出JSON，不要别的文字：
{"minds":[{"npc":"满仓","mood":"一个字","thought":"……"}],"talks":[{"a":"满仓","b":"秋生","text":"……"}]}""" % (day, recent[:240], mem_block)

def call(model):
    body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 1500, 'temperature': 0.85}).encode()
    req = urllib.request.Request('https://open.bigmodel.cn/api/paas/v4/chat/completions', data=body,
        headers={'Authorization': 'Bearer ' + os.environ['ZHIPU_KEY'], 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    ch = r['choices'][0]
    c = ((ch.get('message') or {}).get('content') or '').strip()
    if not c:
        raise RuntimeError('empty finish=%s' % ch.get('finish_reason'))
    return c

def parse(txt):
    m = re.search(r'\{[\s\S]*\}', txt)
    if not m:
        raise ValueError('no json in output')
    d = json.loads(m.group(0))
    minds, talks = [], []
    for x in d.get('minds', []):
        if isinstance(x, dict) and x.get('npc') and x.get('thought'):
            minds.append({'npc': str(x['npc'])[:12], 'mood': str(x.get('mood') or '')[:6], 'thought': str(x['thought'])[:120]})
    for x in d.get('talks', []):
        if isinstance(x, dict) and x.get('text'):
            talks.append({'a': str(x.get('a') or '村里人')[:12], 'b': str(x.get('b') or '')[:12], 'text': str(x['text'])[:120]})
    return minds, talks

ok = False
for model in ['glm-4.7-flash', 'glm-4-flash']:
    try:
        txt = call(model)
        minds, talks = parse(txt)
        if len(minds) >= 5:   # 至少大半户有心事才算成
            ok = True
            break
        print('%s生成内容不足(%d minds)，换模型重试' % (model, len(minds)))
    except Exception as e:
        print('%s生成失败：%s' % (model, str(e)[:80]))
if not ok:
    print('两轮都失败——今天用旧心思（明天再养）')
    sys.exit(1)

M['moodDay'] = day
M['today'] = {'day': day, 'talks': talks}
for x in minds:
    M['minds'][x['npc']] = {'mood': x['mood'], 'thought': x['thought']}
json.dump(M, open('villagers_memory.json', 'w'), ensure_ascii=False)
print('养成了：day %d，%d户心思+%d句村里的话' % (day, len(minds), len(talks)))
for x in minds:
    print(' ', x['npc'], '(%s)' % x['mood'], x['thought'][:36])
for t in talks:
    print('  ·', t['a'], '对', t['b'], '：', t['text'][:44])
