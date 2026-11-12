#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""村民的心思：每天第一次被调用时生成——
   ①各户今天的心事（第一人称：答话prompt+前端对话modal用）
   ②今天村里的话（2-4条村民之间的对话：前端「今天村里」+村志引用）
   判重：villagers_memory.json的moodDay==今天则跳过。
   各户对话记忆（mem）由talk_reply.py负责写，本脚本只养心思。"""
import json, urllib.request, urllib.error, time, os, re, sys
import env_snapshot

V = json.load(open('villagers.json'))
C = json.load(open('chronicle.json'))
try:
    M = json.load(open('villagers_memory.json'))
    if 'minds' not in M: M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}
except Exception:
    M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}

day = int((time.time() * 1000 - V['up']) / 86400000)
need_mood = M.get('moodDay') != day
need_sched = M.get('schedDay') != day
if not need_mood and not need_sched:
    print('今天(day %d)的心思和行程都养过了，跳过' % day)
    sys.exit(0)

names = sorted({vh['name'] for vh in V['homes'].values()})
recent = ' '.join((ch.get('text') or '')[:120] for ch in C.get('chapters', [])[-2:])
mem_txt = []
for n in names:
    m = (M.get('mem') or {}).get(n) or []
    if m:
        mem_txt.append('%s记得的事：%s' % (n, '；'.join('同志说过「%s」他答了「%s」' % ((x.get('text') or '')[:40], (x.get('reply') or '')[:40]) for x in m[-3:])))
mem_block = '\n'.join(mem_txt) if mem_txt else '（同志还没跟谁说过话）'

def rel_block():
    """v88：关系图谱段——骨架静态（婚配/两村）+动态（跟TA说过话的=见外但认得）"""
    pairs = '、'.join('%s和%s' % (V['homes'][w['a']]['name'], V['homes'][w['b']]['name']) for w in V.get('weddings', []) if w['day'] <= day)
    e = [V['homes'][k]['name'] for k, v in V['homes'].items() if v.get('camp', 0) == 0]
    w_ = [V['homes'][k]['name'] for k, v in V['homes'].items() if v.get('camp', 0) == 1]
    if not e or not w_:
        e = ['满仓', '凤兰', '建军', '秋生', '秀兰']
        w_ = ['来福', '爱香', '长贵', '银锁']
    spoken = sorted((M.get('mem') or {}).keys())
    ta = '同志是外来人（玩家），%s——还不熟，村里人对他客气但见外' % ('跟%s说过话' % '、'.join(spoken[:3]) if spoken else '没跟谁搭过话')
    return '【关系】成了亲的：%s。建军单身（话冲心软）。东村：%s；西村：%s。%s。' % (pairs, '、'.join(e), '、'.join(w_), ta)

ENV = env_snapshot.build(V, day)
# v109：生计/心愿/交易摘要（village_economy.py先跑，落了economy_summary.txt）
try:
    ECON = open('economy_summary.txt').read().strip()
except Exception:
    ECON = '（账本还没建——今天照常）'
HUNGRY = M.get('hungry') or []
HUNGRY_TXT = ('【断顿】%s——这两天正是揭不开锅的难处，心事和村里的话里要有这个急。' % '、'.join(HUNGRY)) if HUNGRY else ''
# v119经营：村库——判定者从「提装饰」升到「做经营」（TA：让大模型像玩经营建造游戏一样发展）
CK = M.get('cunKu') or {}
# v122营生段：种子+农时——判定者能算计农事（种地得有种子；夏播扣2秋收+760/800）
# v131农时tip挂现实历（与farmStageReal/judge_build的FARM_WIN同源——豫北冬麦-玉米轮作）
import datetime as _dt
_md = _dt.date.today().month * 100 + _dt.date.today().day
def _days_to(md2):
    today = _dt.date.today()
    tgt = _dt.date(today.year, md2 // 100, md2 % 100)
    if tgt < today: tgt = tgt.replace(year=today.year + 1)
    return (tgt - today).days
FARM_TIP = ''
if 601 <= _md <= 615: FARM_TIP = '麦熟！收成窗口开着（+760粮留种2）——就在这几日'
elif 616 <= _md <= 625: FARM_TIP = '夏播窗口——玉米要扣2份种子，不够播不全'
elif 626 <= _md <= 915: FARM_TIP = '玉米在长，秋收（+800粮留种2）在%d天后' % _days_to(916)
elif 916 <= _md <= 930: FARM_TIP = '秋收窗口——粮要进仓，入冬前村库粮要备过120，冬天田里不长粮'
elif 1020 <= _md <= 1105: FARM_TIP = '冬麦播种窗口——扣2份种子，雪底下越冬'
elif 1106 <= _md <= 1231: FARM_TIP = '冬麦在雪下越冬，地里没活了——农具修修，冬闲备开春'
elif 101 <= _md <= 228: FARM_TIP = '冬闲。麦苗在雪底下——修农具、打井、攒料，等开春'
elif 229 <= _md <= 531: FARM_TIP = '麦子返青了，麦收（+760粮留种2）在%d天后' % _days_to(601)
SAT_TXT = ('【村里的心气】满意度%d/130：%s。' % ((M.get('satisfy') or {}).get('score', 0), '、'.join((M.get('satisfy') or {}).get('lines', [])) or '初来乍到')) + (('低于70，村里人有怨言——想想办法：粮紧就先别动工攒粮，没水井赶紧打一口（石15木4），房没盖齐催催进度，村里缺景致可以栽树立灯柱。') if (M.get('satisfy') or {}).get('score', 100) < 70 else '')
CK_TXT = ('【村库】钱%s 粮%s 木%s 石%s 种子%s份。你是管村库的人——每笔工都扣库：凉亭木12石6／水井石15木4／灯柱石4／石凳石3／铁匠铺木30石20钱15（建成全村盖房快三成，最值）；磨坊木25石15钱10（建成粜粮价0.8涨到1.2——先磨再卖划算）；渔棚木15石5钱5（建成每天进粮+2）；鸡棚木10钱5（建成每天进钱+1）；花圃树不要钱。每天进项：木+2石+1粮+3。农时：%s。种子链：两村每季播种各扣1份（共2），收成各留1份——种子不够来年减产，宁可少建也要留种。库见底村子停摆——先建有用的，不够就攒，别透支。粜粮：集市收粮1粮=0.8钱，提{type:粜粮,amount:卖几石}——粮留40口以下的部分不让卖；磨坊建成后涨到1.2。籴粮：1.2钱买一石粮（比粜贵——商贩赚差价），提{type:籴粮,amount:买几石}——缺粮时的法子。秋收后粮多粜点换钱，入冬前粮紧就籴点补上' % (CK.get('钱', 30), CK.get('粮', 120), CK.get('木', 60), CK.get('石', 50), CK.get('种子', 0), FARM_TIP))
CK_TXT = CK_TXT + SAT_TXT   # v130满意度进判定者视野
# v112：建设回音与已有设施（judge_build.py维护）
BUILT = M.get('built_summary') or []
BUILT_TXT = ('村里已有的设施：' + '、'.join(BUILT[-8:])) if BUILT else '村里还没有公共设施——就火塘、井、集市、田'
BFB = M.get('build_feedback') or []
BFB_TXT = ('。'.join(('成了：' if f.get('ok') else '没成：') + (f.get('note') or '') + '（' + (f.get('why') or '')[:30] + '）' for f in BFB[-3:])) if BFB else '上一批建设还没有回音'
RY = env_snapshot.rhythm()
ROAD = env_snapshot.road_rule()
BIRD = env_snapshot.birdseye(V) if True else ''
REL = rel_block()
prompt = """你是河滩村的「意识」——九户村民的心思由你养着。这是安家第%d天。
村子底子（骨架，不许改）：满仓配凤兰第4天娶、秋生配秀兰第7天娶、来福配爱香第7天娶、长贵配银锁第16天娶，建军单身（二十七八，话冲心软）。性格底子：满仓实诚算婚期、秀兰利落眼睛毒、凤兰热肠爱张罗、秋生手巧话少哼梆子、爱香爽利嗓门亮、长贵老大哥稳当话慢、来福天不亮就起、银锁精细账清。
最近村里发生：%s
%s
%s
%s
%s
%s
%s
%s
%s
请生成：
1. 每户今天的心事——第一人称，30到60字，像那人自己在心里过的一天（满仓在数日子、建军看别人成双是什么滋味、银锁盘的是什么账……各是各的，别全是婚礼话题）
2. 今天村里的话——2到4条，谁对谁说的，一句一条（火塘边、门口、地头，贴着上面的事）。b也可以写「同志」（那个外来人，环境里说了他今天干了什么）——村民对同志说的话会比一般的客气、带点打量
3. 每户今天的行程——3到5段，从早到晚。地点只能从这些里选：home（自家）、plot（自家宅地工地）、fire1（东村火塘）、fire2（西村火塘）、river（河边）、well（村口水井，打水洗衣）。九户的房都还没盖完，每户行程里要有一段在plot干活；上面说过话的两户，要有一段排在同一地点同一时段（他们今天会真的站在一起说话）。最后一段回home。
4. 帮工与匀料：各家的料跟着自家进度走——完工早的户有余料。判定者可以排「帮工」：一户行程里排一段{at:"help",act:"collab"}（去本村进度最慢那家一起干活），两户的帮工段排同一时段；talks里可以写匀料帮工的话（「我家瓦剩两捆，明儿给你捎去」）。每天排帮工0到2段，别多——各家的活还是各家的。

九户每户都必须有一条心事和一份行程，一个都不能少：满仓、凤兰、建军、秋生、秀兰、来福、爱香、长贵、银锁。心事要从各人自己的处境和性子里长出来，别照抄村志和村里的话里已有的句子。
4.5 生计与心愿（v109新）：【生计】段是各户家底和心里惦记的东西（心愿）。心事要贴着生计写——惦记新锄头的会在心里过锄头的事，断顿的愁吃的；村里的话可以带赶集/换东西/借粮的闲话（「明儿逢集，把鸡蛋捎上」）。行程里粮紧的户可以排一段at:"market"（集市街心）。
4.6 经营（v119）：%s
4.6 建设（v112）：村里的公共设施由你提议，type只能选：凉亭/花圃/灯柱/石凳/树/水井；near只能选：fire1/fire2/river/market/center/villager:某名。**一天最多2件，贴着村况和节气提**（天热提凉亭、入冬前提灯柱、人多了提石凳水井）——建了的会真出现在地里，村里人看得到用得到。输出加"build_plans"字段：[{"action":"build","type":"凉亭","near":"fire1","note":"不超16字的理由"}]。村里已有的设施：%s。上批工的回音：%s。没有合适的就不提，给空表
4.6 新心愿提议：家底变了（成交了、东西攒够了）的户，可以起新的惦记。在输出里加"wishes"字段——只给你觉得该起心愿的户（现在没惦记的、或东西够了该换个念想的），每条{"npc":"谁","item":"粮/柴/蛋/布/线/鱼/铁/木/盐/油/钱之一","qty":数量数字,"note":"第一人称短句说清想要什么、为什么"}。别每户都起——一天1到2户正好，心意要有过程。
只输出JSON，不要别的文字：
{"minds":[{"npc":"满仓","mood":"一个字","thought":"……"}],"talks":[{"a":"满仓","b":"秋生","text":"……"}],"wishes":[{"npc":"满仓","item":"铁","qty":1,"note":"……"}],"sched":{"满仓":[{"t":0.25,"at":"plot","act":"build"},{"t":0.5,"at":"fire1","act":"chat"},{"t":0.65,"at":"well","act":"drawWater"},{"t":0.78,"at":"river","act":"lookWater"},{"t":0.92,"at":"home"}]}}""" % (day, recent[:240], mem_block, ENV, REL, RY, ROAD, BIRD, ECON, HUNGRY_TXT, BUILT_TXT, BFB_TXT, CK_TXT)

def call(model, backoff=0):
    if backoff:
        print('  限流，退避%d秒重试' % backoff)
        time.sleep(backoff)
    body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 1500, 'temperature': 0.8}).encode()
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
    wishes = []
    ITEMS_OK = {'粮','柴','蛋','布','线','鱼','铁','木','盐','油','钱'}
    for x in (d.get('wishes') or []):
        if isinstance(x, dict) and x.get('npc') and x.get('item') and x.get('note'):
            item = str(x['item'])[:4]
            if item in ITEMS_OK:
                wishes.append({'npc': str(x['npc'])[:12], 'item': item,
                               'qty': max(1, min(20, float(x.get('qty') or 1))),
                               'note': str(x['note'])[:60]})
    plans = []
    TYPES_OK = {'凉亭', '花圃', '灯柱', '石凳', '树', '水井', '铁匠铺', '粜粮', '磨坊', '渔棚', '鸡棚', '籴粮'}  # v130三座功能建筑进白名单
    for x in (d.get('build_plans') or [])[:4]:
        if isinstance(x, dict) and x.get('type') in TYPES_OK:
            near = str(x.get('near') or 'center')
            if near.startswith('villager:') or near in {'fire1', 'fire2', 'river', 'market', 'center'}:
                pl1 = {'id': 'b%03d' % (len(plans) + 1),
                              'action': 'build', 'type': str(x['type'])[:6],
                              'near': near[:20], 'note': str(x.get('note') or '')[:20]}
                if x['type'] in ('粜粮', '籴粮'):
                    try: pl1['amount'] = max(0, min(400, int(float(x.get('amount') or 0))))
                    except Exception: pl1['amount'] = 0   # v126粜粮带数量（卖几石），非法给0客户端会拒
                plans.append(pl1)
    sched = {}
    AT = {'home','plot','fire1','fire2','river','well'}
    for n, legs in (d.get('sched') or {}).items():
        if isinstance(legs, list) and legs:
            clean = []
            for leg in legs:
                if isinstance(leg, dict) and leg.get('at') in AT:
                    try: t = max(0.0, min(1.0, float(leg.get('t', 0.2))))
                    except Exception: t = 0.2
                    clean.append({'t': t, 'at': str(leg['at']), 'act': str(leg.get('act') or 'walk')[:10]})
            if clean:
                clean.sort(key=lambda x: x['t'])
                sched[str(n)[:12]] = clean
    return minds, talks, sched, wishes, plans

ok = False
MODELS = ['glm-4.7-flash', 'glm-4-flash', 'glm-4.7-flash', 'glm-4-flash', 'glm-4.7-flash']
BACKOFF = [0, 0, 30, 60, 90]
for attempt in range(5):   # v88.5：3轮→5轮，退避拉长——10/31凌晨免费档限流墙实测（两轮429全撞）
    model = MODELS[attempt]
    try:
        txt = call(model, BACKOFF[attempt])
        minds, talks, sched, wishes_new, plans_new = parse(txt)
        if len(minds) >= 7 and len(sched) >= 7:   # 九户至少七户有心事才算成
            ok = True
            break
        print('%s第%d次生成内容不足(%d minds)' % (model, attempt+1, len(minds)))
        time.sleep(20)
    except urllib.error.HTTPError as e:
        print('%s第%d次HTTP %s' % (model, attempt+1, e.code))
        time.sleep(30 if e.code == 429 else 8)
    except Exception as e:
        print('%s第%d次生成失败：%s' % (model, attempt+1, str(e)[:80]))
        time.sleep(15)
if not ok:
    print('两轮都失败——今天用旧心思（明天再养）')
    sys.exit(1)

if need_mood:
    M['moodDay'] = day
    M['today'] = {'day': day, 'talks': talks}
    for x in minds:
        M['minds'][x['npc']] = {'mood': x['mood'], 'thought': x['thought']}
    # v109：GLM新心愿提议挂账（只挂空位；挂超24天的旧心愿自然过期换新）
    M.setdefault('wishes', {})
    for w in (wishes_new or []):
        n = w['npc']
        if n not in M['store']: continue
        cur = M['wishes'].get(n)
        if cur and (day - cur.get('from', day)) < 24: continue
        w['from'] = day
        M['wishes'][n] = w
        print('  新心愿挂账：', n, '想要', w['note'][:24])
    # v112：建设提案权——意图入库（物理全在客户端执行，ack回账见judge_build.py）
    M.setdefault('build_plans', [])
    for p in (plans_new or [])[:2]:
        M['build_plans'].append(p)
        print('  建设提案：', p['type'], '@', p['near'], '—', p['note'][:18])
if need_sched:
    M['schedDay'] = day
    M['sched'] = sched
json.dump(M, open('villagers_memory.json', 'w'), ensure_ascii=False)
print('养成了：day %d，%d户心思+%d句村里的话+%d户行程' % (day, len(minds), len(talks), len(sched)))
for x in minds:
    print(' ', x['npc'], '(%s)' % x['mood'], x['thought'][:36])
for t in talks:
    print('  ·', t['a'], '对', t['b'], '：', t['text'][:44])
for n, legs in sched.items():
    print('  %s:' % n, ' '.join('%d@%s' % (int(l['t']*100), l['at']) for l in legs))
