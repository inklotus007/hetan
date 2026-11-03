#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""村里的生计与交易（v109）：食物消耗+营生产出+心愿+以物易物，全部本地确定性（零API）。
   架构（11/1同志定的）：事件库自己建（本脚本=账本引擎），GLM管决策与说话（minds/talk_reply/chronicle把账说成人话）。
   数据挂在 villagers_memory.json：store（各户库存）+ wishes（心愿）+ trades（成交）+ hungry（断顿标记）。
   幂等：econDay 标记（叙事日），漏跑的叙事日按顺序补账。
   集日判定与前端 isMarketDay 同式：游戏日 g=(now-up)/21600000，(g%30)%5==0 开集（逢五逢十）。"""
import json, math, time, sys

def jshash(x, z):
    h = math.sin(x * 127.1 + z * 311.7) * 43758.5453
    return h - math.floor(h)

V = json.load(open('villagers.json'))
try:
    M = json.load(open('villagers_memory.json'))
    if 'minds' not in M: M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}
except Exception:
    M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}

now = int(time.time() * 1000)
day = int((now - V['up']) / 86400000)          # 叙事日（minds/chronicle同尺度）
g4x = int((now - V['up']) / 21600000)          # 游戏日（4倍速，前端day同尺度）

NAMES = ['满仓', '凤兰', '建军', '秋生', '秀兰', '来福', '爱香', '长贵', '银锁']
SPOUSE = {'满仓': '凤兰', '凤兰': '满仓', '秋生': '秀兰', '秀兰': '秋生', '来福': '爱香', '爱香': '来福', '长贵': '银锁', '银锁': '长贵'}

# 价目表：以粮（斤）为基准的硬通货比价。钱1元≈4斤粮（1995年豫北粮价取整）
PRICE = {'粮': 1, '柴': 0.5, '蛋': 0.25, '布': 3, '线': 1, '鱼': 0.5, '铁': 12, '木': 3, '盐': 2, '油': 4, '钱': 4}   # 单位：斤粮（12/3测试跑太快，抬价出过程感）
SELLBACK = {'鱼': 0.35, '蛋': 0.08, '柴': 0.2, '木': 1.2}   # 集日粜货换钱（收购价低于卖价——1995年贩子的规矩）

# 九户家底（首日初始化——人设化，贫富拉开，不是均匀的）
SEED_STORE = {
    '满仓': {'粮': 10, '柴': 6, '蛋': 2, '钱': 1},
    '凤兰': {'粮': 7, '蛋': 9, '线': 1, '钱': 0},
    '建军': {'粮': 4, '柴': 8, '钱': 2},
    '秋生': {'粮': 9, '木': 5, '钱': 1},
    '秀兰': {'粮': 8, '线': 4, '布': 1, '钱': 1},
    '来福': {'粮': 8, '鱼': 4, '盐': 1, '钱': 0},
    '爱香': {'粮': 7, '蛋': 6, '柴': 2, '钱': 0},
    '长贵': {'粮': 14, '钱': 6, '盐': 2, '柴': 3},
    '银锁': {'粮': 10, '布': 3, '钱': 5, '盐': 3},
}
SEED_WISH = {
    '满仓': {'item': '铁', 'qty': 1, 'note': '新锄头——旧的豁了口，刨地费劲'},
    '凤兰': {'item': '布', 'qty': 2, 'note': '扯二尺花布，给娃做件新袄'},
    '建军': {'item': '钱', 'qty': 12, 'note': '攒钱买辆自行车，村里头一辆'},
    '秋生': {'item': '铁', 'qty': 1, 'note': '一把好刨子，刨面又平又光'},
    '秀兰': {'item': '油', 'qty': 2, 'note': '两瓶煤油，夜里纳鞋底看得清'},
    '来福': {'item': '铁', 'qty': 1, 'note': '一口新铁锅，现在的锅补过三回了'},
    '爱香': {'item': '盐', 'qty': 2, 'note': '两斤盐，腌一缸咸菜过冬'},
    '长贵': {'item': '钱', 'qty': 15, 'note': '攒钱买个收音机，听听戏'},
    '银锁': {'item': '布', 'qty': 6, 'note': '扯六尺布，给长贵做件过冬的棉袄'},
}

# 营生（每叙事日产出，hash抖动确定性）：name -> [(物品, 基数, 抖动)]
LIVELIHOOD = {
    '满仓': [('柴', 1.2, 1)], '凤兰': [('蛋', 1.5, 1)],
    '建军': [('钱', 0.4, 0.3)], '秋生': [('木', 0.45, 1)],
    '秀兰': [('线', 0.6, 0.6)], '来福': [('鱼', 2.2, 1.4)],
    '爱香': [('蛋', 1.2, 0.8)], '长贵': [('钱', 0.35, 0.2)],
    '银锁': [('钱', 0.3, 0.2)],
}

def mouths(name):
    """吃饭的嘴：两口子+活着的孩子算半口。孩子生日用叙事日。"""
    n = 2 if name in SPOUSE else 1
    for c in V.get('children', []):
        # 孩子挂在谁家：按出生那天已成亲的户均分（简化：各家都+0.5，建军+0.3）
        pass
    # children 按村计，不精确挂户——每家有娃户多算半口，建军独身算1口
    if name != '建军' and V.get('children'):
        alive = [c for c in V['children'] if c.get('bornDay', 0) <= day]
        if alive:
            n += 0.5
    return n

def rnd(name, day, salt):
    return jshash(day * 12.9898 + ord(name[0]) * 7.13, salt * 3.7 + day * 1.7)

def fmt_store(st):
    return '、'.join('%s%s' % (k, v) for k, v in sorted(st.items(), key=lambda x: -x[1]) if v > 0) or '空'

# ---------- 首日初始化 ----------
if 'store' not in M:
    M['store'] = {n: dict(SEED_STORE[n]) for n in NAMES}
    M['wishes'] = {}
    for n in NAMES:
        w = dict(SEED_WISH[n]); w['from'] = day
        M['wishes'][n] = w
    M['trades'] = []
    M['econDay'] = day - 1
    M['hungry'] = []
    M.setdefault('fulfilled', [])
    print('v109首日初始化：九户家底+心愿入账')

# ---------- 补账：从 econDay+1 到今天，一天一天跑 ----------
start = M.get('econDay', day - 1) + 1
ran = []
for d in range(start, day + 1):
    S = M['store']; W = M['wishes']
    today_trades = []
    # 1. 吃饭
    for n in NAMES:
        S[n]['粮'] = round(S[n].get('粮', 0) - mouths(n), 1)
    # 2. 营生
    for n in NAMES:
        for (item, base, jit) in LIVELIHOOD[n]:
            gain = max(0, round(base + (rnd(n, d, hash(item) % 97) - 0.5) * 2 * jit, 1))
            if gain > 0: S[n][item] = round(S[n].get(item, 0) + gain, 1)
    # 3. 集日判定（游戏日窗口，与前端isMarketDay同式）
    g_lo = (V['up'] + d * 86400000 - 21600000) // 21600000
    g_hi = g_lo + 4
    has_market = any((g % 30) % 5 == 0 for g in range(g_lo, g_hi + 1))
    # 4. 断顿互助（粮快见底的户先找粮最厚的借——提前到1.5斤，别饿过了才借）
    for n in NAMES:
        if S[n].get('粮', 0) < 1.5:
            giver = max((m for m in NAMES if m != n), key=lambda m: S[m].get('粮', 0))
            if S[giver].get('粮', 0) >= 4:
                S[giver]['粮'] = round(S[giver]['粮'] - 2, 1)
                S[n]['粮'] = round(S[n].get('粮', 0) + 2, 1)
                today_trades.append({'day': d, 'a': giver, 'b': n, 'give': '粮二斤', 'get': '情分', 'kind': 'help'})
    # 4.5 集日籴粮（断粮户拿钱买粮——1元籴2斤，1995年粮站的价）
    if has_market:
        for n in NAMES:
            if S[n].get('粮', 0) < mouths(n) * 2 and S[n].get('钱', 0) >= 1:
                buy_g = min(2.0, math.floor(S[n]['钱'] * 2 * 10) / 10)
                cost_m = round(buy_g / 2, 2)
                S[n]['钱'] = round(S[n]['钱'] - cost_m, 2)
                S[n]['粮'] = round(S[n].get('粮', 0) + buy_g, 1)
                today_trades.append({'day': d, 'a': n, 'b': '粮站', 'give': '钱%g元' % cost_m, 'get': '粮%g斤' % buy_g, 'kind': 'buy'})
    # 4.6 集日粜货（超储变现——鱼超过3条卖掉、蛋超过8个卖掉，收购价低）
    if has_market:
        for n in NAMES:
            for item, keep in (('鱼', 3), ('蛋', 8), ('柴', 6), ('木', 4)):
                extra = S[n].get(item, 0) - keep
                if extra >= 1 and item in SELLBACK:
                    money = round(extra * SELLBACK[item], 2)
                    S[n][item] = round(S[n][item] - extra, 1)
                    S[n]['钱'] = round(S[n].get('钱', 0) + money, 2)
                    today_trades.append({'day': d, 'a': n, 'b': '集市', 'give': '%s%g' % (item, extra), 'get': '钱%g元' % money, 'kind': 'sell'})
    # 5. 双愿撮合：A想换的B有，B想换的A也有 → 各让各的
    for a in NAMES:
        wa = W.get(a)
        if not wa: continue
        ia, qa = wa['item'], wa.get('qty', 1)
        if S[a].get(ia, 0) >= qa:   # 已经有了，心愿该消（达成未消账的兜底）
            M.setdefault('fulfilled', []).append({'npc': a, 'item': ia, 'note': wa.get('note', ''), 'day': d})
            W[a] = None; continue
        for b in NAMES:
            if b == a: continue
            wb = W.get(b)
            if not wb: continue
            ib, qb = wb['item'], wb.get('qty', 1)
            if S[b].get(ia, 0) >= qa and S[a].get(ib, 0) >= qb and ib != ia:
                S[b][ia] = round(S[b][ia] - qa, 1); S[a][ia] = round(S[a].get(ia, 0) + qa, 1)
                S[a][ib] = round(S[a][ib] - qb, 1); S[b][ib] = round(S[b].get(ib, 0) + qb, 1)
                today_trades.append({'day': d, 'a': a, 'b': b, 'give': '%s（%s）' % (wa['note'][:10], ia), 'get': '%s（%s）' % (wb['note'][:10], ib), 'kind': 'swap'})
                M.setdefault('fulfilled', []).append({'npc': a, 'item': ia, 'note': wa.get('note', ''), 'day': d})
                M.setdefault('fulfilled', []).append({'npc': b, 'item': ib, 'note': wb.get('note', ''), 'day': d})
                W[a] = None; W[b] = None
                break
    # 6. 单愿：出粮/钱买（集日可向摊主买，非集日只能向有货的乡邻买）
    for a in NAMES:
        wa = W.get(a)
        if not wa: continue
        ia, qa = wa['item'], wa.get('qty', 1)
        if S[a].get(ia, 0) >= qa: continue
        if ia == '钱':   # 攒钱型心愿：钱慢慢攒，不撮合
            continue
        cost = PRICE.get(ia, 2) * qa
        # 钱和粮都算硬通货：优先花粮，粮不够花钱
        pay_g = min(S[a].get('粮', 0), cost)
        pay_m = max(0.0, cost - pay_g) / PRICE['钱'] if S[a].get('粮', 0) < cost else 0
        can = (S[a].get('粮', 0) >= cost) or (S[a].get('粮', 0) + S[a].get('钱', 0) * PRICE['钱'] >= cost + 2)
        if not can: continue
        sellers = []
        if has_market:
            sellers = ['集市'] + [m for m in NAMES if m != a and S[m].get(ia, 0) >= qa]
        else:
            sellers = [m for m in NAMES if m != a and S[m].get(ia, 0) >= qa]
        if not sellers: continue
        seller = sellers[0]
        S[a]['粮'] = round(S[a].get('粮', 0) - pay_g, 1)
        S[a]['钱'] = round(S[a].get('钱', 0) - pay_m, 1)
        S[a][ia] = round(S[a].get(ia, 0) + qa, 1)
        if seller != '集市':
            S[seller]['粮'] = round(S[seller].get('粮', 0) + pay_g, 1)
            S[seller]['钱'] = round(S[seller].get('钱', 0) + pay_m, 1)
            S[seller][ia] = round(S[seller].get(ia, 0) - qa, 1)
        today_trades.append({'day': d, 'a': a, 'b': seller, 'give': '粮%g斤%s' % (pay_g, ('、钱%g元' % pay_m) if pay_m > 0.05 else ''), 'get': wa['note'][:12] or ia, 'kind': 'buy'})
        M.setdefault('fulfilled', []).append({'npc': a, 'item': ia, 'note': wa.get('note', ''), 'day': d})
        W[a] = None
    # 7. 心愿挂太久的（>18叙事日）先清，等GLM另提
    for n in NAMES:
        w = W.get(n)
        if w and d - w.get('from', d) > 18:
            W[n] = None
    # 8. 断顿标记（给minds写挨饿心事用）
    M['hungry'] = [n for n in NAMES if S[n].get('粮', 0) <= 0.3]
    M['trades'] = (M.get('trades') or [])[-40:] + today_trades
    M['econDay'] = d
    if today_trades or M['hungry']:
        ran.append('第%d天：%s%s' % (d, ('；'.join('%s拿%s跟%s换/买%s' % (t['a'], t['give'], t['b'], t['get']) for t in today_trades)) , ('；断顿：%s' % '、'.join(M['hungry'])) if M['hungry'] else ''))

json.dump(M, open('villagers_memory.json', 'w'), ensure_ascii=False)

# ---------- 给minds/chronicle的摘要（stdout，也存文件） ----------
lines = []
for n in NAMES:
    w = M['wishes'].get(n)
    ws = ('心里惦记：%s' % w['note']) if w else ''
    lines.append('%s家：%s。%s' % (n, fmt_store(M['store'][n]), ws))
summary = '\n'.join(lines)
recent_trades = M.get('trades', [])[-6:]
tr_txt = '；'.join('第%g天%s拿%s从%s那儿换了/买了「%s」' % (t['day'], t['a'], t['give'], t['b'], t['get']) for t in recent_trades) or '近期没有交易'
open('economy_summary.txt', 'w').write(summary + '\n\n【近期成交】' + tr_txt)
print(summary)
if ran:
    print()
    print('【逐日账】')
    for line in ran[-8:]:
        print(' ', line[:150])
print()
print('【近期成交】', tr_txt)
print('v109经济引擎跑完：叙事日%d（游戏日%d），集%s' % (day, g4x, '开' if any((g % 30) % 5 == 0 for g in range(g4x, g4x + 4)) else '未开'))
