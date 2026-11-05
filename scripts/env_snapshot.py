#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""环境快照：判定者的眼睛（v88）——天气/施工进度/TA动向/游戏内日期。
全部本地计算零API；villager_minds和chronicle_gen共用。
天气与进度同引擎hash节奏：jshash(d*7.7,d*3.3)<0.72=晴（与villagerProgress逐日一致）。"""
import json, math, time

def jshash(x, z):
    h = math.sin(x * 127.1 + z * 311.7) * 43758.5453
    return h - math.floor(h)

BP_CELLS = {1: 92, 2: 105, 3: 60, 4: 114, 5: 131}   # 五套蓝图实测格数

def sunny_days(day):
    """开工日必晴+hash节奏——与引擎villagerProgress同式"""
    return sum(1 for i in range(day + 1) if i == 0 or jshash(i * 7.7, i * 3.3) < 0.72)

def progress_line(V, day):
    done, parts = [], []
    for pid, vh in V['homes'].items():
        tot = BP_CELLS.get(vh.get('bp', 1), 92)
        n = sunny_days(day) * vh.get('spd', 10)
        pct = min(100, int(n / tot * 100))
        if pct >= 100: done.append(vh['name'])
        else: parts.append('%s家%d成' % (vh['name'], pct))
    return done, parts

def road_scan(V):
    """路况快照（v90）：各家门前到本camp聚集点的直线，数diffs里已铺的路砖(id=20)。
    这是判定者「看见环境」的眼睛——没路是他明天排修路的依据。全部本地计算零API。"""
    try:
        W = json.load(open('world.json'))
        diffs = (W.get('diffs') or {}).get('a') or {}
    except Exception:
        return ''
    road_set = set()
    for k, v in diffs.items():
        try:
            if int(v) == 20:
                p = k.split(',')
                road_set.add((int(p[0]), int(p[2])))
        except Exception:
            pass
    camps = {0: [0.0, 0.0, 0], 1: [0.0, 0.0, 0]}
    for pid, vh in V['homes'].items():
        c = camps.get(vh.get('camp', 0))
        if c:
            c[0] += vh['plot'][0] + 2.5
            c[1] += vh['plot'][2] + 2
            c[2] += 1
    centers = {}
    for ci, (sx, sz, n) in camps.items():
        if n:
            centers[ci] = (sx / n, sz / n)
    lines = []
    for pid, vh in V['homes'].items():
        ci = vh.get('camp', 0)
        if ci not in centers:
            continue
        cx, cz = centers[ci]
        bx, bz = vh['plot'][0] + 2, vh['plot'][2] - 1
        steps = max(2, int(math.hypot(cx - bx, cz - bz)))
        total = paved = 0
        for i in range(1, steps):
            x = int(bx + (cx - bx) * i / steps)
            z = int(bz + (cz - bz) * i / steps)
            total += 1
            if (x, z) in road_set:
                paved += 1
        if total:
            pct = int((total - paved) / total * 100)
            lines.append('%s家到火塘%d格里%d格无路' % (vh['name'], total, total - paved))
    return lines

BIRD_RES = 8   # 鸟瞰图：每格=世界8格

def birdseye(V):
    """符号鸟瞰图（v91）：判定者的眼睛——宅地/进度/路/聚集点。
    自然地形不在图上（脚本没有世界数组，也用不上：决策全在结构锚点上做）。
    同志的石砖城在村西180格外，一句话交代方位。返回拼进env的两张图。"""
    try:
        W = json.load(open('world.json'))
        diffs = (W.get('diffs') or {}).get('a') or {}
    except Exception:
        diffs = {}
    roads = set()
    for k, v in diffs.items():
        try:
            if int(v) == 20:
                p = k.split(',')
                roads.add((int(p[0]), int(p[2])))
        except Exception:
            pass
    camps = {0: [0.0, 0.0, 0], 1: [0.0, 0.0, 0]}
    for pid, vh in V['homes'].items():
        c = camps.get(vh.get('camp', 0))
        if c:
            c[0] += vh['plot'][0]
            c[1] += vh['plot'][2]
            c[2] += 1
    centers = {ci: (sx / n, sz / n) for ci, (sx, sz, n) in camps.items() if n}
    out = []
    for ci in (0, 1):
        pts = [(vh['plot'][0], vh['plot'][2], vh['name'][0], vh['name'])
               for pid, vh in V['homes'].items() if vh.get('camp', 0) == ci]
        if not pts:
            continue
        xs = [p[0] for p in pts]
        zs = [p[1] for p in pts]
        x0, x1 = min(xs) - 12, max(xs) + 12
        z0, z1 = min(zs) - 12, max(zs) + 12
        gw = (x1 - x0) // BIRD_RES + 1
        gh = (z1 - z0) // BIRD_RES + 1
        grid = [['·'] * gw for _ in range(gh)]
        name_map = {}
        for px, pz, ch, full in pts:
            gx, gz = (px - x0) // BIRD_RES, (pz - z0) // BIRD_RES
            grid[gz][gx] = ch
            name_map.setdefault(full, ch)
        if ci in centers:
            cx, cz = centers[ci]
            gx, gz = int((cx - x0) // BIRD_RES), int((cz - z0) // BIRD_RES)
            if 0 <= gz < gh and 0 <= gx < gw and grid[gz][gx] == '·':
                grid[gz][gx] = '火'
        for rx, rz in roads:
            if x0 <= rx <= x1 and z0 <= rz <= z1:
                gx, gz = (rx - x0) // BIRD_RES, (rz - z0) // BIRD_RES
                if 0 <= gz < gh and 0 <= gx < gw and grid[gz][gx] == '·':
                    grid[gz][gx] = '▪'
        nm = '、'.join('%s(%s)' % (full, ch) for full, ch in name_map.items())
        lines = ['【村%s鸟瞰图】每格=8步。%s=宅地，火=火塘（大家聚的地方），▪=已铺的路，·=空地。宅地：'
                 % ('东' if ci == 0 else '西', '、'.join(name_map.values()))]
        lines.append('\n'.join(''.join(row) for row in grid))
        if ci == 0:
            lines.append('（同志的石砖城不在这张图里——在村西约180步外，全是他的广场石桥房屋，别排村民去动）')
        out.append('\n'.join(lines))
    return '\n\n'.join(out)

def build(V, day, extra=''):
    """返回拼进prompt的环境段。extra可带：今天村里的话等（由调用方拼）。"""
    clear = jshash(day * 7.7, day * 3.3) < 0.72
    weather = '晴，正是干活的天' if clear else '雨，出不了工（人窝在家和火塘，行程别排远门）'
    done, parts = progress_line(V, day)
    prog = '房盖到：' + ('、'.join(parts) if parts else '都在收尾') + ('；封顶完工：' + '、'.join(done) if done else '') + '。雨天停工、晴日推进'
    tong = {}   # v113修：npcs.json缺失时tong未定义——157行UnboundLocalError（测试床暴露的潜伏雷）
    try:
        N = json.load(open('npcs.json'))
        tong = next((t for t in (N.get('npcs') or {}).values() if t.get('name') == '同志'), {})
        ls = tong.get('lastSeen', 0)
        ago = round((time.time() * 1000 - ls) / 86400000) if ls else None
    except Exception:
        ago = None
    try:
        W = json.load(open('world.json'))
        blocks = len((W.get('diffs') or {}).get('a') or {})
    except Exception:
        blocks = 0
    act = tong.get('act') or {}
    acts = []
    if act.get('put'): acts.append('搭了%d块' % act['put'])
    if act.get('dig'): acts.append('挖了%d格' % act['dig'])
    if act.get('talk'): acts.append('说了%d句话' % act['talk'])
    ta = '同志搭的方块累计约%d块（村西的大广场、石桥、东头的旅馆都是他搭的）' % blocks
    if acts: ta += '，今天%s' % '、'.join(acts)
    if ago == 0: ta += '，今天来过村里'
    elif ago is not None and ago <= 2: ta += '，%d天前来过' % ago
    elif ago is not None: ta += '，有%d天没来了' % ago
    try:
        M = json.load(open('villagers_memory.json'))
        spoken = sorted(((M.get('mem') or {}).keys()))
    except Exception:
        spoken = []
    if spoken: ta += '；跟%s说过话' % '、'.join(spoken[:4])
    month, mday = 4, day + 1
    date = '1995年4月%d日' % mday if mday <= 30 else '1995年5月%d日' % (mday - 30)
    rl = road_scan(V)
    road_txt = ''
    if rl:
        road_txt = '【路况】' + '；'.join(rl) + '。无路走起来硌脚。'
    try:
        bird = birdseye(V)
    except Exception as e:
        bird = ''
    if bird:
        road_txt += '\n' + bird
    env = '【环境】今天是%s，安家第%d天。天气：%s。%s。%s。\n【物】每户家里有床有柜，工地堆着木料和瓦；村里公共：两口井、两个火塘、一条河；村西的大广场石桥是同志搭的（那是他的地界，村民不去动）。%s' % (date, day, weather, prog, ta, road_txt)
    return env

def rhythm():
    return '【活人的节奏】行程要贴生理：早饭后出工（plot）、晌午前后一段在fire（做饭吃饭歇晌）、傍晚收工、天黑前回home。下雨的日子全天只排home和fire，不出远门。'
def road_rule():
    return '【修路】看【路况】：哪家的门到火塘无路多，就让那个村民今天「看不过去」——上午或下午排一段road（at写路段中点坐标数组如[12,34]，在自家门前到火塘之间），村民会边走边把路铺上。排了road就不用排别的工。排之前先在talks里让他抱怨一句（如「这门到火塘的路该修了，硌脚」）——先嫌不便，再去修。路况好的家不排。'
