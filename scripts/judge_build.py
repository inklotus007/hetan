#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v112判定者建设链·服务器侧：只管账，不管物理。
   物理全在客户端（唯一有世界状态的地方）：本地找地/校验/放块/记ack。
   本脚本做三件事：
   ①读build_ack.json（客户端执行回执）→ack过的build_plans移入build_done（判定者不再重复提）
   ②把成败+原因写进build_feedback（进明天minds的prompt——异步试错闭环：昨天选址失败今天换地方）
   ③维护built_summary（已建成清单——进prompt防重复建设）
   四层架构（TA 11/6发的）对应：收口=客户端宏动作执行；感知=env_snapshot+built_summary；
   法则=minds prompt的建设纪律；闭环=本脚本的feedback回路。物理校验没有一行在这——Y轴根本不进对话。"""
import json, sys

try:
    M = json.load(open('villagers_memory.json'))
    if 'minds' not in M: M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}
except Exception:
    M = {'moodDay': 0, 'minds': {}, 'mem': {}, 'today': {}}

try:
    A = json.load(open('build_ack.json'))
    if not isinstance(A, list): A = []
except Exception:
    A = []

# v123环境处置（TA：以我为半径——感知包进来看见什么修什么）：坑全填树全砍，确定性不占GLM
# 去重：repair_seen记处置过的坑心/树位——TA走一圈同一个坑不重复修
try:
    P = json.load(open('perception.json'))
except Exception:
    P = None
if P and isinstance(P, dict):
    day = P.get('t', 0)
    seen = M.get('repair_seen', {})
    plans = M.get('repair_plans', [])
    plans = [p for p in plans if isinstance(p, dict)]
    np_ = 0
    for pit in (P.get('pits') or [])[:3]:
        key = 'pit_%s_%s' % (pit.get('x'), pit.get('z'))
        if seen.get(key):
            continue
        seen[key] = 1
        cells = pit.get('cells') or []
        if cells:
            plans.append({'type': 'fill', 'id': 'fill_' + key + '_' + str(day), 'rimY': pit.get('rimY'), 'cells': cells[:200]})
            np_ += 1
    for tb in (P.get('treeBlocks') or [])[:5]:
        key = 'tree_%s_%s' % (tb[0], tb[1]) if isinstance(tb, (list, tuple)) and len(tb) >= 2 else None
        if not key or seen.get(key):
            continue
        seen[key] = 1
        plans.append({'type': 'fell', 'id': 'fell_' + key + '_' + str(day), 'cells': [[tb[0], tb[1]]]})
        np_ += 1
    if np_:
        M['repair_seen'] = dict(list(seen.items())[-200:])   # 上限防膨胀
        M['repair_plans'] = plans[-8:]   # 队列上限
        try:
            json.dump(M, open('villagers_memory.json', 'w'), ensure_ascii=False)
            print('v123处置计划：%d项（坑/树）' % np_)
        except Exception:
            pass

day = M.get('moodDay', 0)
plans = M.get('build_plans') or []

# ===== v119村库：判定者的经营本金 =====
# 价目表（前端executeJudgePlans里有一份同样的——两处必须一致，注释互指）
PRICE = {'凉亭': {'木': 12, '石': 6}, '水井': {'石': 15, '木': 4}, '灯柱': {'石': 4},
         '石凳': {'石': 3}, '铁匠铺': {'木': 30, '石': 20, '钱': 15}, '花圃': {}, '树': {},
         '磨坊': {'木': 25, '石': 15, '钱': 10}, '渔棚': {'木': 15, '石': 5, '钱': 5}, '鸡棚': {'木': 10, '钱': 5}}  # v130三座功能建筑
CK0 = {'钱': 30, '粮': 120, '木': 60, '石': 50, '种子': 2, 'smithyDay': None, 'lastDay': None}
ck = M.get('cunKu')
if not isinstance(ck, dict) or '木' not in ck:
    ck = dict(CK0)
    M['cunKu'] = ck
for k2 in CK0:
    if k2 not in ck:
        ck[k2] = CK0[k2]
# v122农事账：种子→田→粮真流转（TA：种地得有种子得有锄头）——日历驱动，lastFarmDay防重
# 农时（FARM_STAGE同源）：播玉米123-125／麦收120-122／播冬麦240-242／秋收238-239。两村各一份种子播一块田
dd = day % 360 if isinstance(day, int) else 0
if ck.get('lastFarmDay') != day and isinstance(day, int):
    last = ck.get('lastFarmDay')
    lastd = (last % 360) if isinstance(last, int) else None
    if lastd is not None:
        crossed = lambda win: any((lastd < w <= dd) or (dd < lastd and (w > lastd or w <= dd)) for w in win)
        # 农事事件（首日lastd=None只记锚不跑——否则开村当天全年农时全触发白得1560粮）
        if crossed([123]):   # 播玉米：两村各种一块田=扣2份种子
            cost = 2
            if ck.get('种子', 0) >= cost:
                ck['种子'] -= cost
                new_feedback.append({'ok': True, 'note': '夏播', 'why': '两村都播上了——种子扣2份，田里见苗', 'day': day})
            else:
                new_feedback.append({'ok': False, 'note': '夏播', 'why': '种子只剩%s份，播不全两村——秋后留种要算计' % ck.get('种子', 0), 'day': day})
                changed = True
        if crossed([240]):   # 播冬麦：扣2份
            cost = 2
            if ck.get('种子', 0) >= cost:
                ck['种子'] -= cost
            else:
                new_feedback.append({'ok': False, 'note': '秋播', 'why': '冬麦种子不够——来年夏收要减', 'day': day})
                changed = True
        if crossed([122]):   # 麦收：两村各+380粮+1份留种
            ck['粮'] = ck.get('粮', 0) + 760
            ck['种子'] = ck.get('种子', 0) + 2
            new_feedback.append({'ok': True, 'note': '麦收', 'why': '两村麦子进仓+760，留种2份', 'day': day})
            changed = True
        if crossed([239]):   # 秋收（玉米）
            ck['粮'] = ck.get('粮', 0) + 800
            ck['种子'] = ck.get('种子', 0) + 2
            new_feedback.append({'ok': True, 'note': '秋收', 'why': '两村玉米进仓+800，留种2份', 'day': day})
            changed = True
    ck['lastFarmDay'] = day   # 无条件记锚（首日只记不跑，之后靠crossed推农时）

# 每天进项（游戏日变了才加）：村里人日常拾荒+田里拾穗——慢进快出，决策才有重量
if ck.get('lastDay') != day and isinstance(day, int):
    ck['木'] = ck.get('木', 0) + 2
    ck['石'] = ck.get('石', 0) + 1
    ck['粮'] = ck.get('粮', 0) + 3 - 4   # v120粮线（经营三角第一格）：全村吃饭-4，拾穗+3——净-1/天，慢线；收成日大补（下格）
    # v130功能建筑进项：建成才生效（build_done里有且ack ok）
    done_types = [d.get('type') for d in (M.get('build_done') or [])]
    if '渔棚' in done_types:
        ck['粮'] = ck.get('粮', 0) + 2   # 铁蛋的网：河边的第二粮源
    if '鸡棚' in done_types:
        ck['钱'] = ck.get('钱', 0) + 1   # 麦穗的蛋钱
    ck['lastDay'] = day
done = M.get('build_done') or []
feedback = M.get('build_feedback') or []

acked_ids = {a.get('id') for a in A if isinstance(a, dict) and a.get('id')}
changed = False
new_feedback = []

# ①ack过账：plans→done
still = []
for p in plans:
    if p.get('id') in acked_ids:
        rec = {'type': p.get('type'), 'near': p.get('near'), 'note': p.get('note', ''), 'day': p.get('day', day)}
        done.append(rec)
        ack = next((a for a in A if a.get('id') == p.get('id')), {})
        ok = ack.get('ok', False)
        why = (ack.get('why') or ('建成：' + (p.get('note') or '')))[:60]
        # v119扣账：建成才扣——客户端校验是主防线（同批本地扣），这里兜底防透支
        if ok and p.get('type') == '粜粮':
            # v126粜粮（TA：金钱↔粮通道）：过账方向与build相反——粮出钱进。
            # 集市价1粮=0.8钱，与前端60_judge.js的粜粮分支同价同账（两处一致，注释互指）。
            # 客户端已实际扣过；这里以客户端回执的数字为准重算兜底（防本地篡改透支粮荒线）
            n0 = ack.get('n') if isinstance(ack.get('n'), int) else None
            if n0 is None:
                m2 = None
                try:
                    import re as _re
                    m2 = _re.search(r'粜粮(\d+)', why)
                except Exception:
                    m2 = None
                n0 = int(m2.group(1)) if m2 else 0
            n0 = max(0, min(n0, max(0, ck.get('粮', 0) - 40)))
            has_mill = '磨坊' in [d.get('type') for d in done]
            gain = round(n0 * (1.2 if has_mill else 0.8))   # v130磨坊建成：成面价1.2
            ck['粮'] = ck.get('粮', 0) - n0
            ck['钱'] = ck.get('钱', 0) + gain
            new_feedback.append({'ok': n0 > 0, 'note': '粜粮', 'why': ('集市粜粮%d得钱%d（库粮余%s）' % (n0, gain, ck.get('粮', 0)))[:60], 'day': day})
        elif ok:
            cost = PRICE.get(p.get('type'), {})
            short = {k3: v3 - ck.get(k3, 0) for k3, v3 in cost.items() if ck.get(k3, 0) < v3}
            if short:
                ok = False
                why = ('村库透支，账面归零：缺' + '、'.join('%s%d' % (k3, v3) for k3, v3 in short.items()))[:60]
                for k3 in cost:
                    ck[k3] = 0
            else:
                for k3, v3 in cost.items():
                    ck[k3] = ck.get(k3, 0) - v3
            if p.get('type') == '铁匠铺' and ok and ck.get('smithyDay') is None:
                ck['smithyDay'] = day   # v119第一根因果链：铁匠铺落成日——此后盖房spd×1.3（villagerProgress读）
        new_feedback.append({'ok': ok, 'note': (p.get('note') or '')[:24], 'why': why, 'day': day})
        changed = True
    else:
        still.append(p)

# ②-feedback（当天没新ack就沿用旧的，压缩保留6条）
# v120粮荒预警：粮<40——判定者明天prompt里看见（解法管道下格：买粮/粮税/开荒）
if ck.get('粮', 99) < 40:
    new_feedback.append({'ok': False, 'note': '粮荒', 'why': '粮只剩%s，全村一天一天地吃——想想办法' % ck.get('粮', 0), 'day': day})
    changed = True
if new_feedback:
    feedback = (new_feedback + feedback)[:6]
    M['build_feedback'] = feedback

# ③账本修剪：plans留未ack的最近6件；done留最近14件；ack文件消费完清空
M['build_plans'] = still[-6:]
M['build_done'] = done[-14:]
M['built_summary'] = ['%s（%s）' % (d.get('note') or d.get('type'), d.get('near')) for d in done[-14:]]

json.dump(M, open('villagers_memory.json', 'w'), ensure_ascii=False)
if changed or A:
    json.dump([], open('build_ack.json', 'w'), ensure_ascii=False)

print('judge_build：plans=%d done=%d feedback=%d' % (len(M['build_plans']), len(M['build_done']), len(M.get('build_feedback', []))))
for f in M.get('build_feedback', [])[:3]:
    print(' ', '成' if f['ok'] else '败', f['note'], '—', f['why'][:40])
