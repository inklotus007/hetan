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

day = M.get('moodDay', 0)
plans = M.get('build_plans') or []

# ===== v119村库：判定者的经营本金 =====
# 价目表（前端executeJudgePlans里有一份同样的——两处必须一致，注释互指）
PRICE = {'凉亭': {'木': 12, '石': 6}, '水井': {'石': 15, '木': 4}, '灯柱': {'石': 4},
         '石凳': {'石': 3}, '铁匠铺': {'木': 30, '石': 20, '钱': 15}, '花圃': {}, '树': {}}
CK0 = {'钱': 30, '粮': 120, '木': 60, '石': 50, 'smithyDay': None, 'lastDay': None}
ck = M.get('cunKu')
if not isinstance(ck, dict) or '木' not in ck:
    ck = dict(CK0)
    M['cunKu'] = ck
for k2 in CK0:
    if k2 not in ck:
        ck[k2] = CK0[k2]
# 每天进项（游戏日变了才加）：村里人日常拾荒+田里拾穗——慢进快出，决策才有重量
if ck.get('lastDay') != day and isinstance(day, int):
    ck['木'] = ck.get('木', 0) + 2
    ck['石'] = ck.get('石', 0) + 1
    ck['粮'] = ck.get('粮', 0) + 3 - 4   # v120粮线（经营三角第一格）：全村吃饭-4，拾穗+3——净-1/天，慢线；收成日大补（下格）
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
        if ok:
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

print('judge_build：plans=%d done=%d feedback=%d' % (len(M['build_plans']), len(M['build_done']), len(M['build_feedback'])))
for f in M['build_feedback'][:3]:
    print(' ', '成' if f['ok'] else '败', f['note'], '—', f['why'][:40])
