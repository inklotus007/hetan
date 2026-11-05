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
        new_feedback.append({'ok': ok, 'note': (p.get('note') or '')[:24], 'why': why, 'day': day})
        changed = True
    else:
        still.append(p)

# ②-feedback（当天没新ack就沿用旧的，压缩保留6条）
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
