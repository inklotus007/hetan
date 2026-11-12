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
# v131农时挂现实历（前端farmStageReal同源——豫北冬麦-玉米轮作）：进窗触发一次（lastFarmMd防重）。
# 冬季（12-2月）无农事——田里只有越冬麦苗，囤粮策略压给秋天。
NOWMD = __import__('datetime').date.today().month * 100 + __import__('datetime').date.today().day
FARM_WIN = [(601, 615, '麦收'), (616, 625, '播玉米'), (916, 930, '秋收'), (1020, 1105, '播冬麦')]
last_md = ck.get('lastFarmMd') or 0

def _in_win(md, w0, w1):
    return w0 <= md <= w1

for w0, w1, name in FARM_WIN:
    if not (_in_win(NOWMD, w0, w1) and not _in_win(last_md, w0, w1)):
        continue
    if name == '播玉米':
        cost = 2
        if ck.get('种子', 0) >= cost:
            ck['种子'] -= cost
            new_feedback.append({'ok': True, 'note': '夏播', 'why': '麦茬地整好了，玉米种下地——种子扣2份', 'day': day})
        else:
            new_feedback.append({'ok': False, 'note': '夏播', 'why': '种子不够，玉米播不下去——来年减产', 'day': day})
            changed = True
    elif name == '麦收':
        ck['粮'] = ck.get('粮', 0) + 760
        ck['种子'] = ck.get('种子', 0) + 2
        new_feedback.append({'ok': True, 'note': '麦收', 'why': '麦子进场，粮+760，留种2份', 'day': day})
    elif name == '秋收':
        ck['粮'] = ck.get('粮', 0) + 800
        ck['种子'] = ck.get('种子', 0) + 2
        new_feedback.append({'ok': True, 'note': '秋收', 'why': '玉米收了，粮+800，留种2份——入冬前粮要备足，冬天田里不长粮', 'day': day})
    elif name == '播冬麦':
        cost = 2
        if ck.get('种子', 0) >= cost:
            ck['种子'] -= cost
            new_feedback.append({'ok': True, 'note': '播冬麦', 'why': '冬麦下地，雪底下越冬——种子扣2份', 'day': day})
        else:
            new_feedback.append({'ok': False, 'note': '播冬麦', 'why': '种子不够——明年麦子悬了', 'day': day})
            changed = True
    changed = True
    break
ck['lastFarmMd'] = NOWMD if any(_in_win(NOWMD, w0, w1) for w0, w1, _ in FARM_WIN) else ck.get('lastFarmMd', 0)

# v131轻事件（Townsmen灾害的河滩轻版）：事件本地roll（day种子确定性——同天重跑同结果），应对交判定者
import hashlib
_seed = int(hashlib.md5(str(day).encode()).hexdigest()[:8], 16) % 10000
_ev = None
done_types_ev = [d.get('type') for d in (M.get('build_done') or [])]
m_now = __import__('datetime').date.today().month
if _seed % 100 < 8 and 60 <= g0:
    _ev = ('霉变', '连阴雨，仓里霉了一批——粮-15', {'粮': -15})
elif _seed % 100 < 12 and '鸡棚' in done_types_ev:
    _ev = ('黄鼠狼', '夜里黄鼠狼叼走两只鸡——钱-3', {'钱': -3})
elif _seed % 100 < 15 and m_now in (7, 8) and '渔棚' in done_types_ev:
    _ev = ('河汛', '河汛，两天没下成网——粮-2', {'粮': -2})
elif _seed % 100 < 10 and '鸡棚' in done_types_ev:
    _ev = ('添窝', '老母鸡抱出一窝崽——粮+3', {'粮': 3})
if _ev and ck.get('lastEvDay') != day:
    ename, ewhy, eeff = _ev
    for k4, v4 in eeff.items():
        ck[k4] = max(0, ck.get(k4, 0) + v4)
    ck['lastEvDay'] = day
    new_feedback.append({'ok': eeff.get('粮', 0) >= 0 and eeff.get('钱', 0) >= 0, 'note': ename, 'why': ewhy, 'day': day})
    changed = True
    print('事件：', ename)   # 无条件记锚（首日只记不跑，之后靠crossed推农时）

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

# ===== v130满意度（学Townsmen三桶，河滩版）：需求(粮+水)+欲望(住房/装饰/社区/集市) =====
# 每天算一次写memory.satisfy——判定者prompt看见、村长报账念、前端气泡怨话读它。
# 产出联动暂不做（villagerProgress逐天循环用当日值会改写历史——等satisfy有历史存档再说，年轮不被抹）。
if ck.get('lastSatDay') != day and isinstance(day, int):
    okd = [d for d in done if d.get('ok', True)]
    # 需求桶：粮（35分）+水（25分）
    g0 = ck.get('粮', 0)
    p_grain = 35 if g0 >= 80 else (25 if g0 >= 40 else max(0, int(25 * g0 / 40)))
    p_water = 25 if any(d.get('type') == '水井' for d in okd) else -15   # 没井=全村喝河水，扣
    # 欲望桶：住房竣工率(40)+装饰(20)+社区火塘(15)+集市(15)
    # 住房分：按安家天数线性爬（工期约22天，进度纯确定）——不用startDay（开工≠竣工，会虚高：10/14同族「把开工当完工」）
    p_house = int(40 * min(1, day / 22.0))
    n_deco = sum(1 for d in okd if d.get('type') in ('花圃', '灯柱', '树', '石凳'))
    p_deco = min(20, n_deco * 5)
    p_comm = 15 if (M.get('sched') or M.get('moodDay')) else 0   # 火塘生活照常（sched在=日子在过）
    p_mkt = 15   # 集市常设（v98）
    score = p_grain + p_water + p_house + p_deco + p_comm + p_mkt
    lines = ['粮%s' % ('充足' if g0 >= 80 else ('够吃' if g0 >= 40 else '紧张')), '水井%s' % ('有' if p_water > 0 else '还没有')]
    M['satisfy'] = {'score': score, 'grain': p_grain, 'water': p_water, 'house': p_house,
                    'deco': p_deco, 'comm': p_comm, 'mkt': p_mkt, 'lines': lines, 'day': day}
    ck['lastSatDay'] = day
    print('满意度：', score, lines)

acked_ids = {a.get('id') for a in A if isinstance(a, dict) and a.get('id')}
changed = False
new_feedback = []

# ①ack过账：plans→done
still = []
for p in plans:
    if p.get('id') in acked_ids:
        rec = {'type': p.get('type'), 'near': p.get('near'), 'note': p.get('note', ''), 'day': p.get('day', day), 'ok': ok}   # v130：ok入档（满意度要分成败）
        done.append(rec)
        ack = next((a for a in A if a.get('id') == p.get('id')), {})
        ok = ack.get('ok', False)
        why = (ack.get('why') or ('建成：' + (p.get('note') or '')))[:60]
        # v119扣账：建成才扣——客户端校验是主防线（同批本地扣），这里兜底防透支
        if ok and p.get('type') == '籴粮':
            # v131籴粮兜底：钱出粮进（1.2/石，与前端同价同账）
            n0 = ack.get('n') if isinstance(ack.get('n'), int) else 0
            cost0 = round(n0 * 1.2)
            if n0 > 0 and ck.get('钱', 0) >= cost0:
                ck['钱'] = ck.get('钱', 0) - cost0
                ck['粮'] = ck.get('粮', 0) + n0
                new_feedback.append({'ok': True, 'note': '籴粮', 'why': ('籴粮%d花%d钱（库粮%s）' % (n0, cost0, ck.get('粮', 0)))[:60], 'day': day})
        elif ok and p.get('type') == '粜粮':
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
