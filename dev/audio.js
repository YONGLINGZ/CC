/* 百妖夜契 · 离线程序合成音效。无录音、配音、音乐或运行时网络请求。 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NightAudio = api;
})(typeof window === 'object' ? window : globalThis, function (root) {
  'use strict';
  // Every card has its own timbre, gesture, pitch movement and small cast motif.
  // Damage sounds are played by each actual attack event, never by the cast event.
  const PROFILES = Object.freeze({
    S17: {"name":"万剑归宗","kind":"swordstorm","pitch":427,"tail":1843,"length":0.24,"body":71,"weight":0.16,"notes":[271,413,641]},
    S18: {"name":"一剑开天门","kind":"swordstorm","pitch":456,"tail":1890,"length":0.263,"body":74,"weight":0.16,"notes":[284,430,660]},
    S19: {"name":"御剑出鞘","kind":"sword","pitch":485,"tail":1937,"length":0.286,"body":77,"weight":0.16,"notes":[297,447,679]},
    S20: {"name":"两仪剑阵","kind":"focus","pitch":514,"tail":1984,"length":0.309,"body":80,"weight":0.16,"notes":[310,464,698]},
    S21: {"name":"剑气长城","kind":"focus","pitch":543,"tail":2031,"length":0.33199999999999996,"body":83,"weight":0.16,"notes":[323,481,717]},
    S22: {"name":"拔剑问心","kind":"focus","pitch":572,"tail":2078,"length":0.355,"body":86,"weight":0.16,"notes":[336,498,736]},
    S23: {"name":"破军","kind":"sword","pitch":601,"tail":2125,"length":0.378,"body":89,"weight":0.16,"notes":[349,515,755]},
    S24: {"name":"藏锋养神","kind":"focus","pitch":630,"tail":2172,"length":0.24,"body":92,"weight":0.16,"notes":[362,532,774]},
    S25: {"name":"朝游北海","kind":"focus","pitch":659,"tail":2219,"length":0.263,"body":95,"weight":0.16,"notes":[375,549,793]},
    S26: {"name":"剑履山河","kind":"sword","pitch":688,"tail":2266,"length":0.286,"body":98,"weight":0.16,"notes":[388,566,812]},
    S27: {"name":"寒江独钓","kind":"focus","pitch":717,"tail":2313,"length":0.309,"body":101,"weight":0.16,"notes":[401,583,831]},
    S28: {"name":"霜封剑匣","kind":"focus","pitch":746,"tail":2360,"length":0.33199999999999996,"body":104,"weight":0.16,"notes":[414,600,850]},
    S29: {"name":"冰魄回澜","kind":"focus","pitch":775,"tail":2407,"length":0.355,"body":107,"weight":0.16,"notes":[427,617,869]},
    S30: {"name":"乘风归鞘","kind":"focus","pitch":804,"tail":2454,"length":0.378,"body":110,"weight":0.16,"notes":[440,634,888]},
    S31: {"name":"斩断尘缘","kind":"focus","pitch":833,"tail":2501,"length":0.24,"body":113,"weight":0.16,"notes":[453,651,907]},
    S32: {"name":"剑心通明","kind":"focus","pitch":862,"tail":2548,"length":0.263,"body":116,"weight":0.16,"notes":[466,668,926]},
    S33: {"name":"万里横江","kind":"sword","pitch":891,"tail":2595,"length":0.286,"body":119,"weight":0.16,"notes":[479,685,945]},
    S34: {"name":"破晓长歌","kind":"focus","pitch":920,"tail":2642,"length":0.309,"body":122,"weight":0.16,"notes":[492,702,964]},
    S35: {"name":"剑开云海","kind":"sword","pitch":949,"tail":2689,"length":0.33199999999999996,"body":125,"weight":0.16,"notes":[505,719,983]},
    S36: {"name":"天地一剑","kind":"swordstorm","pitch":978,"tail":2736,"length":0.355,"body":128,"weight":0.16,"notes":[518,736,1002]},
    H13: {"name":"欲擒故纵","kind":"shield","pitch":1007,"tail":2783,"length":0.378,"body":131,"weight":0.16,"notes":[531,753,1021]},
    H14: {"name":"红绡借刃","kind":"moon","pitch":1036,"tail":2830,"length":0.24,"body":134,"weight":0.16,"notes":[544,770,1040]},
    H15: {"name":"隔帘听雨","kind":"focus","pitch":1065,"tail":2877,"length":0.263,"body":137,"weight":0.16,"notes":[557,787,1059]},
    H16: {"name":"花信误","kind":"shield","pitch":1094,"tail":2924,"length":0.286,"body":140,"weight":0.16,"notes":[570,804,1078]},
    H17: {"name":"以柔缚刚","kind":"shield","pitch":1123,"tail":2971,"length":0.309,"body":143,"weight":0.16,"notes":[583,821,1097]},
    H18: {"name":"香销玉暖","kind":"focus","pitch":1152,"tail":3018,"length":0.33199999999999996,"body":146,"weight":0.16,"notes":[596,838,1116]},
    H19: {"name":"留客盏","kind":"shield","pitch":1181,"tail":3065,"length":0.355,"body":149,"weight":0.16,"notes":[609,855,1135]},
    H20: {"name":"偷梁换柱","kind":"focus","pitch":1210,"tail":3112,"length":0.378,"body":152,"weight":0.16,"notes":[622,872,1154]},
    H21: {"name":"同心结","kind":"shield","pitch":1239,"tail":3159,"length":0.24,"body":155,"weight":0.16,"notes":[635,889,1173]},
    H22: {"name":"落花逐水","kind":"moon","pitch":1268,"tail":3206,"length":0.263,"body":158,"weight":0.16,"notes":[648,906,1192]},
    H23: {"name":"藏月入袖","kind":"shield","pitch":1297,"tail":3253,"length":0.286,"body":161,"weight":0.16,"notes":[661,923,1211]},
    H24: {"name":"无声挑灯","kind":"shield","pitch":1326,"tail":3300,"length":0.309,"body":164,"weight":0.16,"notes":[674,940,1230]},
    H25: {"name":"笑里藏针","kind":"moon","pitch":1355,"tail":3347,"length":0.33199999999999996,"body":167,"weight":0.16,"notes":[687,957,1249]},
    H26: {"name":"春风照影","kind":"focus","pitch":1384,"tail":3394,"length":0.355,"body":170,"weight":0.16,"notes":[700,974,1268]},
    H27: {"name":"双生绡","kind":"shield","pitch":1413,"tail":3441,"length":0.378,"body":173,"weight":0.16,"notes":[713,991,1287]},
    H28: {"name":"燃香待客","kind":"focus","pitch":1442,"tail":3488,"length":0.24,"body":176,"weight":0.16,"notes":[726,1008,1306]},
    H29: {"name":"断线风筝","kind":"shield","pitch":1471,"tail":3535,"length":0.263,"body":179,"weight":0.16,"notes":[739,1025,1325]},
    H30: {"name":"帘外惊鸿","kind":"moon","pitch":1500,"tail":3582,"length":0.286,"body":182,"weight":0.16,"notes":[752,1042,1344]},
    H31: {"name":"余音绕梁","kind":"shield","pitch":1529,"tail":3629,"length":0.309,"body":185,"weight":0.16,"notes":[765,1059,1363]},
    H32: {"name":"捧心问月","kind":"focus","pitch":1558,"tail":3676,"length":0.33199999999999996,"body":188,"weight":0.16,"notes":[778,1076,1382]},
    H33: {"name":"红尘织梦","kind":"focus","pitch":1587,"tail":3723,"length":0.355,"body":191,"weight":0.16,"notes":[791,1093,1401]},
    H34: {"name":"千面一笑","kind":"shield","pitch":1616,"tail":3770,"length":0.378,"body":194,"weight":0.16,"notes":[804,1110,1420]},
    H35: {"name":"倾城一舞","kind":"moon","pitch":1645,"tail":3817,"length":0.24,"body":197,"weight":0.16,"notes":[817,1127,1439]},
    H36: {"name":"百转归心","kind":"moon","pitch":1674,"tail":3864,"length":0.263,"body":200,"weight":0.16,"notes":[830,1144,1458]},
    H01: {name:'撩弦',kind:'moon',pitch:703,tail:1779,length:0.253,body:115,weight:.15,notes:[347,513,763]},
    H02: {name:'流纱',kind:'shield',pitch:746,tail:1858,length:0.266,body:120,weight:.15,notes:[364,532,786]},
    H03: {name:'请君近前',kind:'focus',pitch:789,tail:1937,length:0.279,body:125,weight:.15,notes:[381,551,809]},
    H04: {name:'偷香',kind:'soul',pitch:832,tail:2016,length:0.292,body:130,weight:.15,notes:[398,570,832]},
    H05: {name:'回眸',kind:'focus',pitch:875,tail:2095,length:0.305,body:135,weight:.15,notes:[415,589,855]},
    H06: {name:'幻席',kind:'focus',pitch:918,tail:2174,length:0.318,body:140,weight:.15,notes:[432,608,878]},
    H07: {name:'借势',kind:'moon',pitch:961,tail:2253,length:0.331,body:145,weight:.15,notes:[449,627,901]},
    H08: {name:'乱息',kind:'shield',pitch:1004,tail:2332,length:0.344,body:150,weight:.15,notes:[466,646,924]},
    H09: {name:'解带',kind:'sword',pitch:1047,tail:2411,length:0.357,body:155,weight:.15,notes:[483,665,947]},
    H10: {name:'两清',kind:'blood',pitch:1090,tail:2490,length:0.370,body:160,weight:.15,notes:[500,684,970]},
    H11: {name:'空席',kind:'shield',pitch:1133,tail:2569,length:0.383,body:165,weight:.15,notes:[517,703,993]},
    H12: {name:'满堂红',kind:'eclipse',pitch:1176,tail:2648,length:0.396,body:170,weight:.15,notes:[534,722,1016]},
    D07: {name:'焚血斩',kind:'blood',pitch:416,tail:2090,length:.37,body:66,weight:.20,notes:[297,359,671]},
    D08: {name:'夺生指',kind:'soul',pitch:449,tail:2260,length:.38,body:69,weight:.20,notes:[318,376,704]},
    D09: {name:'血衣',kind:'shield',pitch:482,tail:2430,length:.39,body:72,weight:.20,notes:[339,393,737]},
    D10: {name:'逆脉',kind:'focus',pitch:515,tail:2600,length:.40,body:75,weight:.20,notes:[360,410,770]},
    D11: {name:'三劫噬心',kind:'eclipse',pitch:548,tail:2770,length:.41,body:78,weight:.20,notes:[381,427,803]},
    D12: {name:'血海归墟',kind:'eclipse',pitch:581,tail:2940,length:.42,body:81,weight:.20,notes:[402,444,836]},
    D01: { name:'借煞回生', kind:'blood', pitch:197, tail:788, length:.45, body:65, weight:.18, notes:[197,296,444] },
    D02: { name:'饮魄', kind:'soul', pitch:935, tail:234, length:.39, body:78, weight:.19, notes:[234,351,526] },
    D03: { name:'夺脉', kind:'eclipse', pitch:1290, tail:3870, length:.53, body:80, weight:.23, notes:[322,644,1289] },
    D04: { name:'魔躯', kind:'shield', pitch:370, tail:1480, length:.54, body:123, weight:.18, notes:[370,555,740,1110] },
    D05: { name:'狂念', kind:'focus', pitch:311, tail:1866, length:.49, body:104, weight:.15, notes:[311,440,659,1318] },
    D06: { name:'万煞归心', kind:'eclipse', pitch:740, tail:4440, length:.75, body:46, weight:.27, notes:[185,277,555,1110,2220] },
    F01: { name:'摄魂', kind:'soul', pitch:877, tail:219, length:.32, body:97, weight:.17, notes:[369,553,830] },
    F02: { name:'夜幕', kind:'shield', pitch:415, tail:1245, length:.43, body:138, weight:.15, notes:[415,622,830] },
    F03: { name:'回响', kind:'focus', pitch:277, tail:1108, length:.46, body:138, weight:.13, notes:[277,415,554,830] },
    F04: { name:'归潮', kind:'eclipse', pitch:831, tail:2493, length:.53, body:58, weight:.24, notes:[207,415,830,1661] },
    F05: { name:'影袭', kind:'moon', pitch:1480, tail:740, length:.18, body:123, weight:.14, notes:[740,1108,1480] },
    F06: { name:'移影', kind:'wind', pitch:2700, tail:913, length:.26, body:277, weight:.12, notes:[553,830,1244] },
    F07: { name:'魂衣', kind:'shield', pitch:554, tail:1662, length:.50, body:184, weight:.16, notes:[554,830,1108] },
    F08: { name:'引魂', kind:'paper', pitch:3170, tail:4750, length:.28, body:311, weight:.12, notes:[622,932,1397] },
    F09: { name:'噬念', kind:'soul', pitch:1130, tail:283, length:.42, body:94, weight:.18, notes:[311,466,698] },
    F10: { name:'裂界', kind:'eclipse', pitch:1060, tail:4240, length:.58, body:66, weight:.24, notes:[265,530,1060,2120] },
    F11: { name:'摄念', kind:'bell', pitch:1244, tail:2489, length:.38, body:311, weight:.13, notes:[622,1244,1865] },
    F12: { name:'万相归一', kind:'eclipse', pitch:622, tail:3732, length:.74, body:39, weight:.28, notes:[155,311,622,1244,2489] },
    C01: { name:'爪击', kind:'claw', pitch:1720, tail:3300, length:.16, body:105, weight:.18, notes:[440,660] },
    C02: { name:'敛息', kind:'shield', pitch:523, tail:1318, length:.30, body:196, weight:.15, notes:[523,784] },
    C03: { name:'窥隙', kind:'mark', pitch:1046, tail:1568, length:.23, body:262, weight:.13, notes:[784,1046] },
    C04: { name:'扑杀', kind:'pounce', pitch:1320, tail:3100, length:.35, body:62, weight:.27, notes:[220,440,880] },
    C05: { name:'连爪', kind:'claw', pitch:2140, tail:4200, length:.115, body:130, weight:.15, notes:[587,740,880] },
    C06: { name:'猫步', kind:'wind', pitch:1480, tail:720, length:.24, body:330, weight:.12, notes:[660,880,1175] },
    C07: { name:'流影', kind:'shield', pitch:659, tail:1976, length:.34, body:220, weight:.14, notes:[659,988,1318] },
    C08: { name:'戏鼠', kind:'claw', pitch:2350, tail:1120, length:.145, body:147, weight:.14, notes:[880,784,1046] },
    C09: { name:'夜猎', kind:'paper', pitch:2600, tail:4100, length:.20, body:349, weight:.12, notes:[698,1046] },
    C10: { name:'候机', kind:'focus', pitch:370, tail:740, length:.39, body:185, weight:.14, notes:[370,554,740] },
    C11: { name:'蓄爪', kind:'focus', pitch:294, tail:1175, length:.45, body:147, weight:.15, notes:[294,440,1175] },
    C12: { name:'月下守', kind:'shield', pitch:392, tail:1568, length:.52, body:131, weight:.19, notes:[392,587,784] },
    C13: { name:'血契', kind:'blood', pitch:165, tail:82, length:.45, body:55, weight:.19, notes:[165,196,294] },
    C14: { name:'噬魂', kind:'soul', pitch:680, tail:210, length:.34, body:87, weight:.19, notes:[330,494,659] },
    C15: { name:'妖火符', kind:'fire', pitch:760, tail:4300, length:.40, body:73, weight:.21, notes:[349,523,698] },
    C16: { name:'残月', kind:'moon', pitch:920, tail:2700, length:.42, body:82, weight:.23, notes:[415,622,1244] },
    C17: { name:'金瞳', kind:'mark', pitch:1318, tail:2637, length:.30, body:330, weight:.16, notes:[988,1318,1976] },
    C18: { name:'追猎', kind:'pounce', pitch:1850, tail:3800, length:.23, body:98, weight:.19, notes:[392,784,1175] },
    C19: { name:'缚影', kind:'shield', pitch:466, tail:1397, length:.38, body:156, weight:.17, notes:[466,698,932] },
    C20: { name:'铃音', kind:'bell', pitch:1175, tail:2349, length:.62, body:392, weight:.16, notes:[1175,1568,2349] },
    C21: { name:'终夜', kind:'eclipse', pitch:780, tail:2200, length:.65, body:42, weight:.29, notes:[196,392,784,1568] },
    C22: { name:'裂帛', kind:'tear', pitch:3100, tail:1600, length:.21, body:110, weight:.18, notes:[622,932,1244] },
    C23: { name:'逐影', kind:'wind', pitch:3600, tail:1500, length:.17, body:294, weight:.12, notes:[1175,880,1760] },
    C24: { name:'狂爪', kind:'claw', pitch:1980, tail:5100, length:.14, body:98, weight:.20, notes:[494,740,988,1480] },
    C25: { name:'灵巧', kind:'spark', pitch:1568, tail:3136, length:.22, body:392, weight:.12, notes:[784,1568,2093] },
    C26: { name:'翻檐', kind:'wind', pitch:2300, tail:680, length:.25, body:131, weight:.17, notes:[523,784,1568] },
    C27: { name:'歃血', kind:'blood', pitch:131, tail:55, length:.60, body:49, weight:.23, notes:[131,196,262,392] },
    C28: { name:'血饮', kind:'soul', pitch:990, tail:165, length:.48, body:65, weight:.24, notes:[262,392,659] },
    C29: { name:'献寿', kind:'blood', pitch:110, tail:440, length:.55, body:41, weight:.22, notes:[220,330,440] },
    C30: { name:'残心', kind:'tear', pitch:2700, tail:780, length:.32, body:55, weight:.24, notes:[277,415,830] },
    C31: { name:'借命', kind:'shield', pitch:349, tail:1047, length:.42, body:87, weight:.20, notes:[349,523,1047] },
    C32: { name:'绕指柔', kind:'silk', pitch:880, tail:1760, length:.30, body:294, weight:.13, notes:[880,1175,1760] },
    C33: { name:'逆鳞', kind:'scale', pitch:740, tail:2220, length:.36, body:123, weight:.19, notes:[370,740,1480] },
    C34: { name:'护心', kind:'shield', pitch:262, tail:1048, length:.64, body:65, weight:.23, notes:[262,392,523,1046] },
    C35: { name:'盾返', kind:'scale', pitch:1397, tail:3490, length:.28, body:78, weight:.23, notes:[349,698,1397] },
    C36: { name:'归息', kind:'heal', pitch:440, tail:880, length:.62, body:220, weight:.16, notes:[440,554,660,880] },
    S01: { name:'霜锋', kind:'sword', pitch:2290, tail:1420, length:.23, body:392, weight:.16, notes:[784,1175,1568] },
    S02: { name:'凝霜', kind:'iceguard', pitch:698, tail:2093, length:.43, body:233, weight:.15, notes:[698,1046,1397] },
    S03: { name:'听雪', kind:'swordfocus', pitch:880, tail:1760, length:.49, body:294, weight:.14, notes:[587,880,1175,1760] },
    S04: { name:'断流', kind:'swordburst', pitch:1760, tail:4400, length:.49, body:147, weight:.23, notes:[440,880,1320,1760] },
    S05: { name:'寒芒', kind:'iceblade', pitch:3136, tail:1568, length:.29, body:330, weight:.16, notes:[1046,1568,2093] },
    S06: { name:'踏雪', kind:'frostwind', pitch:4100, tail:1720, length:.26, body:349, weight:.12, notes:[698,1046,1760] },
    S07: { name:'冰镜', kind:'iceguard', pitch:830, tail:2490, length:.48, body:277, weight:.16, notes:[830,1244,1661] },
    S08: { name:'三叠泉', kind:'sword', pitch:2780, tail:1850, length:.15, body:440, weight:.14, notes:[880,1318,1760] },
    S09: { name:'澄心', kind:'frostwind', pitch:2670, tail:5340, length:.35, body:440, weight:.12, notes:[880,1175,1568,2349] },
    S10: { name:'回锋', kind:'swordfocus', pitch:1175, tail:2349, length:.31, body:392, weight:.14, notes:[784,1175,1568] },
    S11: { name:'藏剑', kind:'swordfocus', pitch:523, tail:2093, length:.56, body:175, weight:.15, notes:[523,784,1046,2093] },
    S12: { name:'霜天壁', kind:'iceguard', pitch:466, tail:1864, length:.65, body:156, weight:.20, notes:[466,698,932,1397] },
    S13: { name:'以血淬刃', kind:'frostblood', pitch:659, tail:2637, length:.46, body:82, weight:.17, notes:[330,659,988,1318] },
    S14: { name:'剑鸣', kind:'sword', pitch:1976, tail:2960, length:.38, body:494, weight:.17, notes:[988,1480,1976,2960] },
    S15: { name:'碎霜', kind:'iceshatter', pitch:3520, tail:880, length:.47, body:196, weight:.22, notes:[880,1760,2637,3520] },
    S16: { name:'万川归寂', kind:'swordstorm', pitch:1568, tail:4704, length:.72, body:98, weight:.25, notes:[392,784,1175,1568,2349] }
  });
  const ENCOUNTERS = Object.freeze({
    hehuan_checkpoint:{name:'门前盘查',notes:[293,440,587],kind:'chain',air:1370},
    hehuan_qinheng:{name:'账册旁的活人',notes:[349,466,698],kind:'wood',air:1150},
    hehuan_ledger:{name:'账册交给谁',notes:[392,523,784],kind:'echo',air:1680},
    tainted_mercy: { name:'路边的茶', notes:[330,494,740], kind:'wood', air:950 },
    demonic_offer: { name:'灰衣人的药', notes:[165,247,370], kind:'ritual', air:780 },
    demonic_warning: { name:'剑穗与清心玉', notes:[523,784,1046], kind:'glass', air:2200 },
    mirror_trial: { name:'照心残镜', notes:[311,466,698,1046], kind:'echo', air:1700 },
    demon_manual: { name:'残卷', notes:[147,220,330,494], kind:'ritual', air:660 },
    fallen_hunt: { name:'隔路相逢', notes:[185,370,740], kind:'steel', air:2850 },
    moon_trace: { name:'旧铃', notes:[277,415,830], kind:'bell', air:1770 },
    sealed_name: { name:'封字', notes:[138,207,311,466], kind:'ritual', air:690 },
    moon_vow: { name:'留白', notes:[415,622,1244], kind:'echo', air:1350 },
    armory: { name:'石室', notes:[369,739,1479], kind:'steel', air:3270 },
    sovereign_wake: { name:'归来', notes:[207,311,415,622], kind:'echo', air:1210 },
    sovereign_recall: { name:'旧约', notes:[155,233,466,698], kind:'chain', air:1840 },
    sovereign_memory: { name:'自问', notes:[196,294,440,659], kind:'rift', air:980 },
    well: { name:'倒映祈愿井', notes:[294,440,587], kind:'water', air:460 },
    shrine: { name:'无面旧神龛', notes:[131,196,262], kind:'gong', air:720 },
    dreamshop: { name:'卖梦人的摊位', notes:[523,784,1175], kind:'glass', air:1700 },
    theatre: { name:'纸灯戏台', notes:[622,466,932], kind:'wood', air:2400 },
    umbrella: { name:'雨夜借伞', notes:[330,494,659], kind:'rain', air:1100 },
    pawnshop: { name:'蛇鳞当铺', notes:[185,277,554], kind:'scale', air:3100 },
    fox: { name:'狐妖契约', notes:[440,659,988], kind:'bell', air:2000 },
    shop: { name:'百妖商铺', notes:[587,880,1175], kind:'coin', air:2800 },
    rest: { name:'月庭休憩', notes:[262,330,392], kind:'wind', air:620 },
    riftwatch: { name:'封域望哨', notes:[147,220,330,622], kind:'rift', air:830 },
    supply: { name:'断桥军需', notes:[330,494,740], kind:'wood', air:1450 },
    cultlab: { name:'逆仪残室', notes:[110,165,233,349], kind:'ritual', air:520 },
    swordgrave: { name:'寒碑剑冢', notes:[587,880,1760], kind:'steel', air:3300 },
    pilgrims: { name:'失序行营', notes:[196,294,415], kind:'ritual', air:960 },
    prisoner: { name:'锁魂囚笼', notes:[185,370,554], kind:'chain', air:2100 },
    echo: { name:'异声裂隙', notes:[415,622,932,1397], kind:'echo', air:1270 },
    broker: { name:'千灯密约', notes:[659,988,1318], kind:'coin', air:3700 },
    liu_first: { name:'雾中采药人', notes:[330,440,659], kind:'wind', air:760 },
    liu_return: { name:'一灯相候', notes:[440,659,880,988], kind:'water', air:920 },
    liu_final: { name:'药香归路', notes:[523,659,784,1046], kind:'bell', air:1190 },
    ji_first: { name:'断剑问路', notes:[294,440,622], kind:'steel', air:2600 },
    ji_return: { name:'袖中宝光', notes:[294,415,622,740], kind:'coin', air:2900 },
    ji_final: { name:'暗巷故人', notes:[147,220,311,466], kind:'chain', air:3450 },
    wen_first: { name:'负伤叛徒', notes:[165,247,370], kind:'ritual', air:660 },
    wen_return: { name:'追缉黑符', notes:[185,277,392,554], kind:'rift', air:980 },
    wen_final: { name:'余烬中的证词', notes:[220,330,494,740], kind:'echo', air:1350 },
    sect_duel: { name:'宗门试剑', notes:[698,1046,1397], kind:'steel', air:3800 },
    herb_caravan: { name:'药车留灯', notes:[349,523,698], kind:'wood', air:870 },
    relic_dispute: { name:'残宝争执', notes:[196,294,440,659], kind:'gong', air:1700 },
    night_watch: { name:'异派守夜', notes:[262,392,587,880], kind:'wind', air:550 },
    ...Object.fromEntries([
      ['debt','coin',247,1900],['medicine','water',330,760],['letter','paper',294,1100],
      ['name','echo',277,1500],['lanterns','bell',392,680],['grain','wood',220,1600],
      ['bridge','stone',196,1250],['forge','steel',370,3200],['theatre','bell',415,2300],['well','water',185,830]
    ].flatMap(([id,kind,base,air])=>[1,2,3].map(step=>[`tale_${id}_${step}`,{name:'雾中回声',notes:[base,base*1.5,base*(step===2?1.19:1.8),base*(1.8+step*.1)],kind,air:air+step*80}]))),
    ...Object.fromEntries([['lotus_boss','wood',196],['gate_boss','bell',294],['camp_boss','chain',165],['snake','water',247],['bell_boss','gong',220]].flatMap(([id,kind,base])=>[1,2,3].map(step=>[`boss_${id}_${step}`,{name:'镇境旧事',notes:[base,base*(1+step*.1),base*1.5,base*2],kind,air:620+step*220}]))),
    boss_marsh_boss_1:{name:'灯下旧事',notes:[170,260,381,600],kind:'echo',air:930},
    boss_marsh_boss_2:{name:'灯下旧事',notes:[170,260,412,600],kind:'echo',air:1110},
    boss_marsh_boss_3:{name:'灯下旧事',notes:[170,260,443,600],kind:'echo',air:1290},
    boss_furnace_boss_1:{name:'灯下旧事',notes:[190,287,381,650],kind:'echo',air:930},
    boss_furnace_boss_2:{name:'灯下旧事',notes:[190,287,412,650],kind:'echo',air:1110},
    boss_furnace_boss_3:{name:'灯下旧事',notes:[190,287,443,650],kind:'echo',air:1290},
    boss_mirror_boss_1:{name:'灯下旧事',notes:[210,314,381,700],kind:'echo',air:930},
    boss_mirror_boss_2:{name:'灯下旧事',notes:[210,314,412,700],kind:'echo',air:1110},
    boss_mirror_boss_3:{name:'灯下旧事',notes:[210,314,443,700],kind:'echo',air:1290},
    boss_abyss_boss_1:{name:'灯下旧事',notes:[230,341,381,750],kind:'echo',air:930},
    boss_abyss_boss_2:{name:'灯下旧事',notes:[230,341,412,750],kind:'echo',air:1110},
    boss_abyss_boss_3:{name:'灯下旧事',notes:[230,341,443,750],kind:'echo',air:1290},
    boss_feiye_1:{name:'灯下旧事',notes:[250,368,381,800],kind:'echo',air:930},
    boss_feiye_2:{name:'灯下旧事',notes:[250,368,412,800],kind:'echo',air:1110},
    boss_feiye_3:{name:'灯下旧事',notes:[250,368,443,800],kind:'echo',air:1290},
    boss_feiye_echo_1:{name:'灯下旧事',notes:[270,395,381,850],kind:'echo',air:930},
    boss_feiye_echo_2:{name:'灯下旧事',notes:[270,395,412,850],kind:'echo',air:1110},
    boss_feiye_echo_3:{name:'灯下旧事',notes:[270,395,443,850],kind:'echo',air:1290},
    boss_retainer_1:{name:'灯下旧事',notes:[290,422,381,900],kind:'echo',air:930},
    boss_retainer_2:{name:'灯下旧事',notes:[290,422,412,900],kind:'echo',air:1110},
    boss_retainer_3:{name:'灯下旧事',notes:[290,422,443,900],kind:'echo',air:1290},
    boss_heart_1:{name:'灯下旧事',notes:[310,449,381,950],kind:'echo',air:930},
    boss_heart_2:{name:'灯下旧事',notes:[310,449,412,950],kind:'echo',air:1110},
    boss_heart_3:{name:'灯下旧事',notes:[310,449,443,950],kind:'echo',air:1290},
    boss_snake_ascended_1:{name:'灯下旧事',notes:[330,476,381,1000],kind:'echo',air:930},
    boss_snake_ascended_2:{name:'灯下旧事',notes:[330,476,412,1000],kind:'echo',air:1110},
    boss_snake_ascended_3:{name:'灯下旧事',notes:[330,476,443,1000],kind:'echo',air:1290},
    blood_lesson:{name:'经页与代价',notes:[185,277,415,660],kind:'rift',air:900},
    blood_debt:{name:'经页与代价',notes:[205,277,415,705],kind:'rift',air:900},
    blood_choice:{name:'经页与代价',notes:[225,277,415,750],kind:'rift',air:900},
    boss_lotus_awake:{name:'家令归宁',notes:[262,330,392,524],kind:'wood',air:900},
    campfire_hunt:{name:'火塘剑阵',notes:[147,220,311,440],kind:'steel',air:2900},
    road_aftermath:{name:'雾中车铃',notes:[294,440,587],kind:'wood',air:1200},
    ...Object.fromEntries(['lotus_boss','furnace_boss','gate_boss','camp_boss','snake','bell_boss','marsh_boss','mirror_boss','abyss_boss','feiye','feiye_echo','retainer','heart','snake_ascended'].flatMap((b,i)=>['source','cave'].map((k,j)=>['faction_'+b+'_'+k,{name:'器物与来意',notes:[196+i*51,294+j*43,440+i*61,660+j*71],kind:i?'gong':'wood',air:900+j*300}]))),
    cave:{name:'山腹藏幽',notes:[165,247,392,660],kind:'water',air:640}
  });
  const MAX_VOICES = 56;
  const state = { context:null, bus:null, muted:false, volume:.30, unlocked:false, lastError:'', attempts:0, contextsCreated:0 };
  const stats = { eventsPlayed:0, peakScheduled:0, sourcesCreated:0, rejectedVoices:0, profilesUsed:new Set(), encountersUsed:new Set(), lastCue:'' };
  const buffers = new WeakMap();
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const finite = (value,fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const now = () => state.context ? state.context.currentTime : 0;

  function noiseBuffer(ctx) {
    if (buffers.has(ctx)) return buffers.get(ctx);
    const buffer = ctx.createBuffer(1,Math.ceil(ctx.sampleRate*1.5),ctx.sampleRate), data = buffer.getChannelData(0);
    let seed=0x6d2b79f5;
    for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
    buffers.set(ctx,buffer);return buffer;
  }
  function makeBus(ctx,volume,measure=stats) {
    const gain=ctx.createGain(),compressor=ctx.createDynamicsCompressor(),filter=ctx.createBiquadFilter();
    gain.gain.value=volume;
    filter.type='highpass';filter.frequency.value=30;filter.Q.value=.5;
    compressor.threshold.value=-16;compressor.knee.value=16;compressor.ratio.value=8;compressor.attack.value=.002;compressor.release.value=.15;
    gain.connect(filter);filter.connect(compressor);compressor.connect(ctx.destination);
    return {ctx,gain,filter,compressor,sources:new Set(),measure,closed:false};
  }
  function retain(bus,source,nodes) {
    bus.sources.add(source);bus.measure.sourcesCreated++;
    bus.measure.peakScheduled=Math.max(bus.measure.peakScheduled,bus.sources.size);
    source.onended=function(){bus.sources.delete(source);for(const node of [source,...nodes]){try{node.disconnect();}catch(_){}}};
  }
  function available(bus) {
    if(!bus||bus.closed)return false;
    if(bus.sources.size>=MAX_VOICES){bus.measure.rejectedVoices++;return false;}return true;
  }
  function envelope(gain,t,duration,level,attack=.003) {
    gain.setValueAtTime(.00001,t);gain.exponentialRampToValueAtTime(Math.max(.00002,level),t+Math.min(attack,duration*.2));
    gain.exponentialRampToValueAtTime(.00001,t+duration);
  }
  function tone(bus,freq,duration,options={}) {
    if(!available(bus))return;
    const ctx=bus.ctx,t=finite(options.at,ctx.currentTime)+finite(options.delay,0),d=clamp(duration,.02,1.5);
    const source=ctx.createOscillator(),gain=ctx.createGain();source.type=options.wave||'sine';
    source.frequency.setValueAtTime(clamp(freq,35,15000),t);
    if(options.end)source.frequency.exponentialRampToValueAtTime(clamp(options.end,35,15000),t+d*.85);
    if(options.detune)source.detune.value=options.detune;
    envelope(gain.gain,t,d,clamp(finite(options.level,.10),.00002,.33),options.attack||.003);
    source.connect(gain);gain.connect(bus.gain);retain(bus,source,[gain]);source.start(t);source.stop(t+d+.012);
  }
  function hiss(bus,freq,duration,options={}) {
    if(!available(bus))return;
    const ctx=bus.ctx,t=finite(options.at,ctx.currentTime)+finite(options.delay,0),d=clamp(duration,.02,1.35);
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=noiseBuffer(ctx);source.playbackRate.value=clamp(finite(options.rate,1),.4,2.5);
    filter.type=options.filter||'bandpass';filter.Q.value=options.q||.7;filter.frequency.setValueAtTime(clamp(freq,55,15000),t);
    if(options.end)filter.frequency.exponentialRampToValueAtTime(clamp(options.end,55,15000),t+d*.9);
    envelope(gain.gain,t,d,clamp(finite(options.level,.14),.00002,.33),options.attack||.003);
    source.connect(filter);filter.connect(gain);gain.connect(bus.gain);retain(bus,source,[filter,gain]);source.start(t,0,d);source.stop(t+d+.012);
  }
  function bell(bus,freq,duration,level=.11,at) {
    [1,2.76,5.4].forEach((n,i)=>tone(bus,freq*n,duration/(1+i*.48),{at,level:level/[1,3.8,8][i],wave:'sine',end:freq*n*.992}));
  }
  function heartbeat(bus,freq,level=.15,at) {
    tone(bus,freq,.14,{at,level,end:freq*.64});tone(bus,freq*1.12,.16,{at,delay:.17,level:level*.68,end:freq*.68});
  }
  // Steel is voiced with inharmonic, fast-decaying partials; frost has sparse
  // crystalline overtones and a soft air bed. Neither uses the cat's bass hit.
  function steel(bus,freq,duration,level,at) {
    [1,2.01,3.88,6.11].forEach((ratio,i)=>tone(bus,freq*ratio,duration/(1+i*.42),{
      at,level:level/[1,3.2,6,12][i],end:freq*ratio*.984,wave:'sine',attack:.0015
    }));
  }
  function crystal(bus,freq,duration,level,at) {
    [1,1.498,2.756].forEach((ratio,i)=>tone(bus,freq*ratio,duration/(1+i*.28),{
      at,delay:i*.016,level:level/[1,3.5,7][i],end:freq*ratio*1.004,attack:.004
    }));
  }
  function playSignature(bus,p,phase='impact',hitIndex=0,at) {
    const t=finite(at,bus.ctx.currentTime),shift=1+clamp(hitIndex,0,6)*.052,pitch=p.pitch*shift,weight=p.weight;
    if(phase==='cast'){
      if(/^(sword|ice|frost)/.test(p.kind)){
        hiss(bus,3800,.075,{at:t,level:.045,end:6700,attack:.009});
        steel(bus,p.notes[0],.16,.029,t+.012);
        tone(bus,p.notes[1],.19,{at:t,delay:.045,level:.025,end:p.notes[2],attack:.012});
        return;
      }
      hiss(bus,2400+p.notes[0],.055,{at:t,level:.075,end:4200});
      p.notes.slice(0,3).forEach((n,i)=>tone(bus,n,.10+i*.018,{at:t,delay:.027*i,level:.025/(1+i*.3),wave:'sine'}));
      if(['blood','focus'].includes(p.kind))tone(bus,p.body,.18,{at:t,level:.035,end:p.body*1.2});
      return;
    }
    const common={at:t,level:weight,end:p.tail*shift};
    switch(p.kind){
      case 'claw':
        hiss(bus,pitch,p.length,common);hiss(bus,6500,.028,{at:t,level:.10});tone(bus,p.body*shift,.10,{at:t,level:weight*.52,end:p.body*.48});break;
      case 'pounce':
        hiss(bus,pitch,p.length,{...common,attack:.014});tone(bus,p.body,.27,{at:t,level:weight,end:39});
        hiss(bus,4900,.055,{at:t,delay:.015,level:.13});bell(bus,p.notes[1],.36,.055,t+.025);break;
      case 'tear':
        hiss(bus,pitch,p.length,{...common,q:1.5});hiss(bus,pitch*.7,p.length*.66,{at:t,delay:.037,end:p.tail*.7,level:weight*.8});
        tone(bus,p.body,.13,{at:t,level:weight*.57,end:p.body*.45});break;
      case 'moon':
        hiss(bus,pitch,p.length,{...common,q:1.2,attack:.012});tone(bus,p.body,.24,{at:t,level:weight*.75,end:43});
        bell(bus,p.notes[2],.55,.075,t+.012);break;
      case 'eclipse':
        hiss(bus,pitch,p.length,{...common,filter:'lowpass',attack:.01});tone(bus,p.body,.58,{at:t,level:weight,end:35});
        hiss(bus,6200,.065,{at:t,level:.16});p.notes.slice(1).forEach((n,i)=>bell(bus,n,.65,.055,t+i*.045));break;
      case 'shield':
        bell(bus,pitch,p.length,weight*.56,t);bell(bus,p.tail,p.length*.7,weight*.17,t+.025);
        hiss(bus,950,.14,{at:t,level:.05,end:2600,attack:.018});tone(bus,p.body,.21,{at:t,level:weight*.3});break;
      case 'mark':
        tone(bus,pitch,p.length,{...common,level:weight*.55,wave:'sine',attack:.009});
        bell(bus,p.tail,p.length*.9,weight*.33,t+.07);break;
      case 'bell': bell(bus,pitch,p.length,weight,t);bell(bus,p.tail,p.length*.8,weight*.38,t+.08);break;
      case 'blood':
        heartbeat(bus,p.body,weight*.8,t);tone(bus,pitch,p.length,{at:t,level:weight*.3,end:p.tail,wave:'triangle',attack:.02});
        hiss(bus,340,p.length*.7,{at:t,level:.065,end:85,filter:'lowpass'});break;
      case 'soul':
        tone(bus,pitch,p.length,{at:t,level:weight*.3,end:p.tail,wave:'triangle',attack:.015});
        hiss(bus,1800,p.length,{at:t,level:weight*.7,end:260,q:1.5});tone(bus,p.body,.19,{at:t,level:weight*.68,end:40});break;
      case 'fire':
        hiss(bus,pitch,p.length,{...common,filter:'lowpass',attack:.012});hiss(bus,5200,.075,{at:t,delay:.04,level:.16});
        tone(bus,p.body,.25,{at:t,level:weight*.7,end:40});break;
      case 'wind':
        hiss(bus,pitch,p.length,{...common,attack:.012});tone(bus,p.body,.17,{at:t,level:weight*.26,end:p.body*1.7});break;
      case 'paper':
        for(let i=0;i<2;i++)hiss(bus,pitch+i*700,.065,{at:t,delay:i*.085,level:weight,end:p.tail});break;
      case 'focus':
        tone(bus,pitch,p.length,{at:t,level:weight*.42,end:p.tail,wave:'triangle',attack:.022});
        bell(bus,p.tail,.35,weight*.3,t+.12);break;
      case 'spark':
        p.notes.forEach((n,i)=>tone(bus,n,.18,{at:t,delay:.04*i,level:weight*.5/(1+i*.3),end:n*1.02}));break;
      case 'silk':
        hiss(bus,2300,p.length,{at:t,level:.06,end:5800,attack:.016});p.notes.forEach((n,i)=>bell(bus,n,.25,weight*.34,t+i*.04));break;
      case 'scale':
        hiss(bus,5100,.065,{at:t,level:.10});bell(bus,pitch,p.length,weight*.65,t);tone(bus,p.body,.16,{at:t,level:weight*.65,end:p.body*.6});break;
      case 'heal':
        p.notes.forEach((n,i)=>tone(bus,n,.38,{at:t,delay:.055*i,level:weight*.36,attack:.015}));
        hiss(bus,1600,.32,{at:t,level:.035,end:3100,attack:.02});break;
      case 'sword':
        hiss(bus,pitch,p.length,{...common,level:weight*.53,q:1.8,attack:.004});
        steel(bus,p.body*shift,p.length*1.2,weight*.60,t);crystal(bus,p.notes[2],.29,weight*.15,t+.034);break;
      case 'iceblade':
        hiss(bus,pitch,p.length,{...common,level:weight*.40,q:2.1,attack:.006});
        steel(bus,p.body,.21,weight*.44,t);crystal(bus,p.notes[1]*shift,.42,weight*.55,t+.018);break;
      case 'iceguard':
        hiss(bus,1800,p.length*.75,{at:t,level:weight*.22,end:p.tail,attack:.035});
        p.notes.slice(0,3).forEach((n,i)=>crystal(bus,n,p.length,weight*.38/(1+i*.5),t+i*.043));
        tone(bus,p.body,p.length*.7,{at:t,level:weight*.25,end:p.body*1.003,attack:.035});break;
      case 'swordfocus':
        tone(bus,p.body,p.length,{at:t,level:weight*.37,end:p.body*2,wave:'triangle',attack:.045});
        steel(bus,pitch,p.length*.8,weight*.28,t+.065);crystal(bus,p.tail,.42,weight*.26,t+.14);break;
      case 'frostwind':
        hiss(bus,pitch,p.length,{...common,level:weight*.52,attack:.024,q:.65});
        p.notes.slice(0,3).forEach((n,i)=>tone(bus,n,.25,{at:t,delay:i*.048,level:weight*.26,attack:.012,end:n*1.012}));break;
      case 'frostblood':
        heartbeat(bus,p.body,weight*.35,t);steel(bus,pitch,.23,weight*.25,t+.035);
        crystal(bus,p.notes[2],p.length,weight*.34,t+.12);hiss(bus,2200,.19,{at:t,delay:.09,level:weight*.25,end:p.tail});break;
      case 'swordburst':
        hiss(bus,pitch,p.length,{...common,level:weight*.67,q:1.3,attack:.009});
        steel(bus,p.body,.46,weight*.70,t);steel(bus,p.notes[1],.36,weight*.32,t+.035);
        crystal(bus,p.notes[3],.56,weight*.27,t+.06);break;
      case 'iceshatter':
        for(let i=0;i<3;i++){
          hiss(bus,pitch-i*610,.055+i*.012,{at:t,delay:i*.038,level:weight*.44,end:p.tail,filter:'highpass'});
          tone(bus,p.notes[3-i],.22,{at:t,delay:i*.042,level:weight*.32,end:p.notes[3-i]*.73});
        }
        steel(bus,p.body,p.length,weight*.42,t+.028);break;
      case 'swordstorm':
        hiss(bus,940,p.length,{at:t,level:weight*.39,end:p.tail,attack:.035,q:.75});
        steel(bus,p.body,.56,weight*.54,t);steel(bus,p.notes[1],.46,weight*.35,t+.075);
        p.notes.slice(2).forEach((n,i)=>crystal(bus,n,.52,weight*.29/(1+i*.3),t+.08+i*.07));
        hiss(bus,6100,.14,{at:t,delay:.17,level:weight*.43,end:2400});break;
    }
  }
  function withSound(label,callback,profileId) {
    state.attempts++;
    if(!state.unlocked||state.muted||state.volume===0||!state.bus||state.context.state!=='running')return false;
    try{
      const before=stats.sourcesCreated;callback(state.bus,now()+.004);
      if(stats.sourcesCreated>before){stats.eventsPlayed++;stats.lastCue=label;if(profileId)stats.profilesUsed.add(profileId);return true;}
    }catch(error){state.lastError=String(error&&error.message||error).slice(0,160);}return false;
  }
  async function unlock() {
    try{
      if(!state.context){const Constructor=root.AudioContext||root.webkitAudioContext;if(!Constructor){state.lastError='当前浏览器不支持 Web Audio';return false;}
        state.context=new Constructor({latencyHint:'interactive'});state.contextsCreated++;state.bus=makeBus(state.context,state.muted?0:state.volume);
      }
      if(state.context.state==='suspended')await state.context.resume();
      state.unlocked=state.context.state==='running';return state.unlocked;
    }catch(error){state.lastError=String(error&&error.message||error).slice(0,160);state.unlocked=false;return false;}
  }
  function profile(id) {
    const p=PROFILES[id];return p ? {...p,notes:[...p.notes],signature:[p.kind,p.pitch,p.tail,p.length,p.body,p.weight,...p.notes].join(':')} : null;
  }
  function playCard(id) {
    const p=PROFILES[id];if(!p)return false;
    return withSound('card:'+id,(bus,t)=>{
      // Cards without a later shield/heal/mark/hit event need their own full
      // focus, bell or energy gesture here. Attack cards remain cast-only.
      playSignature(bus,p,['H05','H06','C09','C10','C11','C20','C25','S03','S09','S10','S11','F03','F08','F11','D05'].includes(id)?'impact':'cast',0,t);
    },id);
  }
  function preview(id) {
    const p=PROFILES[id];if(!p)return false;
    return withSound('preview:'+id,(bus,t)=>playSignature(bus,p,'impact',0,t),id);
  }
  const cueAlias={reward:'rewardReveal',rare:'rareReveal',legendary:'treasure',gold:'coin',purchase:'coin',levelup:'treasure',contract:'fox',revive:'resurrect',reshuffle:'shuffle',newTurn:'turn',click:'select',eventResult:'eventChoice'};
  function cue(bus,name,options={},t) {
    const amount=finite(options.amount,0),p=PROFILES[options.cardId];
    switch(cueAlias[name]||name){
      case 'select':tone(bus,660,.065,{at:t,level:.055,end:880});break;
      case 'cancel':tone(bus,440,.08,{at:t,level:.045,end:330});break;
      case 'denied':tone(bus,165,.12,{at:t,level:.07,end:110,wave:'triangle'});break;
      case 'draw':hiss(bus,3200,.052,{at:t,level:.09,end:5300});tone(bus,880,.035,{at:t,level:.02});break;
      case 'shuffle':for(let i=0;i<4;i++)hiss(bus,2200+i*460,.055,{at:t,delay:i*.045,level:.075,end:4600});break;
      case 'discard':hiss(bus,1900,.075,{at:t,level:.06,end:700});break;
      case 'block':if(p)playSignature(bus,p,'impact',0,t);else{bell(bus,784,.29,.10,t);tone(bus,196,.15,{at:t,level:.06});}break;
      case 'mark':if(p&&p.kind==='mark')playSignature(bus,p,'impact',0,t);else bell(bus,options.amount<0?523:1175,.23,.075,t);break;
      case 'chill':
        if(amount===0)return false;
        if(amount<0){hiss(bus,5400,.16,{at:t,level:.065,end:1700});[2093,1568,1175].forEach((n,i)=>tone(bus,n,.18,{at:t,delay:i*.025,level:.035,end:n*.8}));}
        else{crystal(bus,1397+clamp(amount,1,4)*83,.37,.073,t);hiss(bus,3100,.20,{at:t,level:.035,end:5700,attack:.018});}break;
      case 'swordIntent':
        if(amount===0)return false;
        if(amount<0){steel(bus,392,.35,.075,t);hiss(bus,2200,.19,{at:t,level:.055,end:5600});}
        else{const frequency=784*Math.pow(2,clamp(options.total||amount,1,8)/12);steel(bus,frequency,.31,.065,t);tone(bus,frequency*1.5,.22,{at:t,delay:.035,level:.023});}break;
      case 'frostseal':crystal(bus,1568,.50,.075,t);tone(bus,784,.33,{at:t,delay:.04,level:.025});break;
      case 'consumeMark':hiss(bus,1400,.23,{at:t,level:.12,end:5600});bell(bus,1760,.32,.10,t);break;
      case 'heal':playSignature(bus,p&&p.kind==='heal'?p:PROFILES.C36,'impact',0,t);break;
      case 'selfDamage':playSignature(bus,p&&['blood','frostblood'].includes(p.kind)?p:PROFILES.C13,'impact',0,t);break;
      case 'affliction':tone(bus,110,.35,{at:t,level:.065,end:73,wave:'triangle'});hiss(bus,850,.25,{at:t,level:.04,end:290});break;
      case 'corruption':{const n=220*Math.pow(1.09,clamp(options.total||amount,0,6));tone(bus,n,.34,{at:t,level:.07,end:n*.8});tone(bus,n*1.067,.37,{at:t,level:.035,end:n*1.08});break;}
      case 'fall':tone(bus,55,.65,{at:t,level:.13,end:165});hiss(bus,1800,.55,{at:t,level:.075,end:4700});[311,466,622].forEach((n,i)=>bell(bus,n,.7,.07,t+i*.10));break;
      case 'suppression':bell(bus,880,.45,.08,t);tone(bus,440,.26,{at:t,level:.035,end:660});break;
      case 'soul':bell(bus,amount<0?415:830,.42,.075,t);tone(bus,207,.27,{at:t,level:.045,end:amount<0?104:415});break;
      case 'environment':hiss(bus,620,.40,{at:t,level:.065,end:240,attack:.04});break;
      case 'weapon':steel(bus,739,.36,.085,t);if(options.rebellious)heartbeat(bus,69,.08,t);break;
      case 'powerRecovered':
      case 'power':tone(bus,147,.34,{at:t,level:.09,end:588,wave:'triangle',attack:.022});bell(bus,1175,.30,.065,t+.12);break;
      case 'poison':
        for(let i=0;i<3;i++)tone(bus,170+i*83,.11,{at:t,delay:i*.06,level:.085,end:510+i*145});
        hiss(bus,1200,.30,{at:t,level:.06,end:360});break;
      case 'cleanse':bell(bus,1046,.40,.10,t);bell(bus,1568,.35,.05,t+.08);hiss(bus,2100,.20,{at:t,level:.045,end:5000});break;
      case 'relic':bell(bus,1046,.47,.10,t);bell(bus,1568,.4,.06,t+.075);break;
      case 'resurrect':
        tone(bus,55,.34,{at:t,level:.13,end:220});[523,784,1046,1568].forEach((n,i)=>bell(bus,n,.68,.075,t+i*.055));break;
      case 'bell':bell(bus,1175,.45,.12,t);break;
      case 'coin':[1760,2093,2637].forEach((n,i)=>bell(bus,n,.20,.065,t+i*.038));break;
      case 'rewardReveal':
        hiss(bus,1700,.17,{at:t,level:.08,end:4400});[523,659,784].forEach((n,i)=>bell(bus,n,.40,.07,t+i*.065));break;
      case 'rareReveal':
        tone(bus,98,.27,{at:t,level:.12,end:196});[523,784,1046,1568].forEach((n,i)=>bell(bus,n,.66,.08,t+i*.055));break;
      case 'treasure':
        tone(bus,65,.36,{at:t,level:.13,end:130});hiss(bus,1200,.33,{at:t,level:.06,end:5800});
        [392,587,784,1175,1568].forEach((n,i)=>bell(bus,n,.85,.075,t+i*.06));break;
      case 'eventChoice':bell(bus,659,.37,.075,t);bell(bus,988,.38,.06,t+.08);break;
      case 'fox':heartbeat(bus,82,.08,t);[440,659,988].forEach((n,i)=>bell(bus,n,.55,.07,t+i*.1));break;
      case 'combo':
        tone(bus,440*Math.pow(1.122,clamp(amount||3,1,8)),.18,{at:t,level:.09,end:1046});hiss(bus,4100,.045,{at:t,level:.07});break;
      case 'turn':tone(bus,392,.11,{at:t,level:.05});tone(bus,587,.15,{at:t,delay:.055,level:.055});break;
      case 'death':tone(bus,196,.75,{at:t,level:.12,end:49,wave:'triangle'});hiss(bus,520,.45,{at:t,level:.055,end:70,filter:'lowpass'});break;
      case 'victory':[392,523,659,784].forEach((n,i)=>bell(bus,n,.65,.08,t+i*.08));tone(bus,98,.40,{at:t,level:.09});break;
      case 'win':[392,523,659,784,1046,1568].forEach((n,i)=>bell(bus,n,1.10,.08,t+i*.10));tone(bus,98,.65,{at:t,level:.10});break;
      case 'enemyHit':hiss(bus,1700,.13,{at:t,level:.15,end:610});tone(bus,90,.15,{at:t,level:.13,end:45});break;
      case 'paperHit':hiss(bus,3700,.14,{at:t,level:.17,end:1400});hiss(bus,6100,.035,{at:t,level:.08});tone(bus,130,.10,{at:t,level:.07,end:70});break;
      case 'lanternHit':hiss(bus,540,.28,{at:t,level:.17,end:3400,filter:'lowpass'});tone(bus,78,.18,{at:t,level:.10,end:44});break;
      case 'apeHit':tone(bus,57,.19,{at:t,level:.18,end:35});hiss(bus,730,.12,{at:t,level:.18,end:310,filter:'lowpass'});break;
      case 'boneHit':tone(bus,340,.085,{at:t,level:.12,end:130,wave:'triangle'});hiss(bus,2700,.08,{at:t,level:.17,end:1100});break;
      case 'yakshaHit':hiss(bus,2300,.24,{at:t,level:.18,end:720});tone(bus,48,.29,{at:t,level:.18,end:35});bell(bus,370,.16,.035,t);break;
      case 'automatonKettle':hiss(bus,3900,.26,{at:t,level:.13,end:1200,attack:.03});bell(bus,1660,.23,.055,t);tone(bus,140,.11,{at:t,level:.06,end:88});break;
      case 'automatonBroom':hiss(bus,2700,.22,{at:t,level:.16,end:640});[0,.035,.07].forEach(d=>tone(bus,330,.045,{at:t+d,level:.065,end:110,wave:'triangle'}));break;
      case 'automatonShears':[0,.065].forEach(d=>{hiss(bus,5100,.04,{at:t+d,level:.12,end:1700});bell(bus,2140,.07,.045,t+d);});break;
      case 'automatonPan':tone(bus,110,.25,{at:t,level:.13,end:52,wave:'triangle'});[419,683,991].forEach(n=>bell(bus,n,.34,.045,t));break;
      case 'automatonRevenge':[196,185,174].forEach((n,i)=>tone(bus,n,.2,{at:t+i*.1,level:.07,wave:'triangle'}));hiss(bus,840,.32,{at:t,level:.07,end:320});break;
      case 'snakeBlade':hiss(bus,3700,.24,{at:t,level:.16,end:940});bell(bus,1175,.20,.045,t);tone(bus,80,.19,{at:t,level:.12,end:41});break;
      case 'snakeBreath':hiss(bus,760,.43,{at:t,level:.16,end:3100,attack:.03});tone(bus,72,.22,{at:t,level:.08,end:40});break;
      case 'snakeCoil':hiss(bus,1100*(1+finite(options.hitIndex,0)*.16),.17,{at:t,level:.16,end:2600});tone(bus,65,.16,{at:t,level:.13,end:38});break;
      case 'snakeShed':hiss(bus,5200,.33,{at:t,level:.13,end:1100});[740,1110,1665].forEach((n,i)=>bell(bus,n,.3,.06,t+i*.035));break;
      default:return false;
    }return true;
  }
  function playCue(name,options={}) {return withSound('cue:'+name,(bus,t)=>cue(bus,name,options,t),options.cardId);}
  let lastDrawAt=-100;
  function playEvent(event,context={}) {
    if(!event||typeof event!=='object')return false;
    const cardId=event.cardId||context.cardId,type=event.type,p=PROFILES[cardId],payload={...event,cardId};
    if(type==='card')return playCard(cardId);if(type==='trapSet'||type==='trapTrigger')return playCard(event.cardId||cardId);if(type==='breath')return playCue('focus',event);
    if(type==='attack'){
      if(event.source==='enemy'){
        const enemy=context.enemyId||event.enemyId,intent=String(event.intent||context.intentName||context.intent||'');
        const normal={m16:'boneHit',m17:'automatonPan',m18:'boneHit',m22:'paperHit',m23:'paperHit',m24:'automatonShears',m25:'paperHit',m26:'enemyHit',m27:'automatonShears',m28:'enemyHit',m29:'boneHit',m30:'paperHit',m31:'automatonShears',m32:'boneHit',m33:'lanternHit',m34:'enemyHit',m35:'enemyHit',m36:'enemyHit',m37:'boneHit',m04:'paperHit',m05:'boneHit',m06:'automatonShears',m07:'boneHit',m08:'automatonPan',m09:'boneHit',m10:'boneHit',m11:'lanternHit',m12:'automatonShears',m13:'paperHit',m14:'automatonPan',m15:'boneHit',m01:'automatonPan',m02:'paperHit',m03:'automatonShears',m19:'lanternHit',m20:'enemyHit',m21:'boneHit',paper:'paperHit',lantern:'lanternHit',ape:'apeHit',bone:'boneHit',yaksha:'yakshaHit'};
        if(enemy==='lotus_boss')return playCue(/奉茶/.test(intent)?'automatonKettle':/洒扫/.test(intent)?'automatonBroom':/缝衣/.test(intent)?'automatonShears':'automatonPan',payload);
        return playCue(enemy==='snake'?(/蛇息/.test(intent)?'snakeBreath':/绞缠/.test(intent)||event.hitIndex>0?'snakeCoil':'snakeBlade'):(normal[enemy]||'enemyHit'),payload);
      }
      return withSound('hit:'+(cardId||event.kind||'claw'),(bus,t)=>{
        playSignature(bus,p||PROFILES.C01,'impact',finite(event.hitIndex,0),t);
        if(event.absorbed>0)bell(bus,1318,.15,.033,t+.015);
      },cardId);
    }
    if(type==='draw'){
      if(now()-lastDrawAt<.045)return false;lastDrawAt=now();return playCue('draw',event);
    }
    if(type==='blockClear')return false;
    if(type==='enemySkill'&&event.kind==='revenge')return playCue('automatonRevenge',payload);
    if(type==='block'&&event.source==='enemy'&&(context.enemyId||event.enemyId)==='lotus_boss')return playCue('automatonPan',payload);
    if(['mark','chill','swordIntent'].includes(type)&&event.amount===0)return false;
    if(type==='mark'&&event.amount<0)return playCue('consumeMark',payload);
    if(type==='poison'&&event.amount<0)return playCue('cleanse',payload);
    if(type==='relic')return playCue(['fox','ninelives'].includes(event.relic)?'resurrect':event.relic==='bell'?'bell':event.relic==='frostseal'?'frostseal':'relic',payload);
    if(type==='block'&&event.source==='enemy'&&(context.enemyId||event.enemyId)==='snake')return playCue('snakeShed',payload);
    return playCue(type,payload);
  }
  function encounterSound(bus,p,t) {
      const level=['rain','wind','water'].includes(p.kind) ? .08 : .045;
      hiss(bus,p.air,.55,{at:t,level,end:p.air*.67,attack:.055,filter:p.kind==='rain'?'highpass':'bandpass'});
      p.notes.forEach((n,i)=>{
        if(['steel','chain'].includes(p.kind)){
          steel(bus,n,.48,.060/(1+i*.3),t+i*.10);
          if(p.kind==='chain')hiss(bus,4600,.04,{at:t,delay:i*.10,level:.035,end:1900});
        }else if(['rift','ritual'].includes(p.kind)){
          tone(bus,n,.67,{at:t,delay:i*.09,level:.050/(1+i*.4),end:p.kind==='rift'?n*1.08:n*.97,wave:'triangle',attack:.045});
          tone(bus,n*1.069,.50,{at:t,delay:i*.09,level:.018,attack:.06});
        }else if(p.kind==='echo'){
          for(let j=0;j<3;j++)tone(bus,n,.28,{at:t,delay:i*.08+j*.17,level:.046/(1+j*1.5+i*.4),attack:.012});
        }else if(['gong','wood'].includes(p.kind)){
          tone(bus,n,.55,{at:t,delay:i*.085,level:.085/(1+i*.3),wave:p.kind==='wood'?'triangle':'sine'});
          tone(bus,n*1.48,.34,{at:t,delay:i*.085,level:.027});
        }else bell(bus,n,.68,.075/(1+i*.22),t+i*.09);
      });
      if(p.kind==='water'){tone(bus,330,.12,{at:t,delay:.34,level:.10,end:1050});}
  }
  function playEncounter(id) {
    const p=ENCOUNTERS[id];if(!p)return false;
    return withSound('encounter:'+id,(bus,t)=>{
      stats.encountersUsed.add(id);encounterSound(bus,p,t);
    });
  }
  function stopVoices() {
    if(!state.bus)return;
    for(const source of state.bus.sources){try{source.stop();}catch(_){}try{source.disconnect();}catch(_){}}
    state.bus.sources.clear();
  }
  function adjustMaster() {
    if(!state.bus)return;
    const gain=state.bus.gain.gain,t=now();gain.cancelScheduledValues(t);
    if(typeof gain.cancelAndHoldAtTime==='function'){try{gain.cancelAndHoldAtTime(t);}catch(_){}}
    gain.setValueAtTime(state.muted?0:state.volume,t);
  }
  function setMuted(value) {
    state.muted=Boolean(value);if(state.muted)stopVoices();try{adjustMaster();}catch(_){}return state.muted;
  }
  function setVolume(value) {
    state.volume=clamp(finite(value,state.volume),0,1);if(state.volume===0)stopVoices();try{adjustMaster();}catch(_){}return state.volume;
  }
  function getState() {
    return {supported:Boolean(root.AudioContext||root.webkitAudioContext),unlocked:state.unlocked,muted:state.muted,volume:state.volume,contextState:state.context?state.context.state:'not-created',contextsCreated:state.contextsCreated,
      attempts:state.attempts,eventsPlayed:stats.eventsPlayed,sourcesCreated:stats.sourcesCreated,activeVoices:state.bus?state.bus.sources.size:0,peakScheduled:stats.peakScheduled,
      maxVoices:MAX_VOICES,rejectedVoices:stats.rejectedVoices,profilesUsed:[...stats.profilesUsed],encountersUsed:[...stats.encountersUsed],lastCue:stats.lastCue,lastError:state.lastError};
  }
  // QA-only, explicit offline rendering. Does not unlock or alter live audio state.
  async function renderOffline(ids=['C01','C04','C15','C02','C13','C24']) {
    const Constructor=root.OfflineAudioContext||root.webkitOfflineAudioContext;
    if(!Constructor)throw new Error('OfflineAudioContext unavailable');
    const slot=1.2,sampleRate=44100,duration=Math.max(1,ids.length)*slot+.6;
    const ctx=new Constructor(1,Math.ceil(sampleRate*duration),sampleRate);
    const measure={peakScheduled:0,sourcesCreated:0,rejectedVoices:0},bus=makeBus(ctx,.30,measure);
    // Render per-slot batches below the production live voice limit, even though
    // offline contexts schedule their entire timeline before executing a source.
    ids.forEach((id,i)=>{
      if(!PROFILES[id])throw new Error('Unknown audio profile: '+id);
      bus.sources.clear();playSignature(bus,PROFILES[id],'impact',0,i*slot+.03);
    });
    const rendered=await ctx.startRendering();
    return {sampleRate:rendered.sampleRate,duration:rendered.duration,channels:[new Float32Array(rendered.getChannelData(0))],...measure};
  }
  async function renderEncountersOffline(ids=Object.keys(ENCOUNTERS)) {
    const Constructor=root.OfflineAudioContext||root.webkitOfflineAudioContext;
    if(!Constructor)throw new Error('OfflineAudioContext unavailable');
    const slot=1.2,sampleRate=44100,duration=Math.max(1,ids.length)*slot+.6;
    const ctx=new Constructor(1,Math.ceil(sampleRate*duration),sampleRate);
    const measure={peakScheduled:0,sourcesCreated:0,rejectedVoices:0},bus=makeBus(ctx,.30,measure);
    ids.forEach((id,i)=>{
      if(!ENCOUNTERS[id])throw new Error('Unknown audio encounter: '+id);
      bus.sources.clear();encounterSound(bus,ENCOUNTERS[id],i*slot+.03);
    });
    const rendered=await ctx.startRendering();
    return {sampleRate:rendered.sampleRate,duration:rendered.duration,channels:[new Float32Array(rendered.getChannelData(0))],...measure};
  }
  async function renderCuesOffline(names) {
    const Constructor=root.OfflineAudioContext||root.webkitOfflineAudioContext;
    if(!Constructor)throw new Error('OfflineAudioContext unavailable');
    const slot=1.2,sampleRate=44100,ctx=new Constructor(1,Math.ceil(sampleRate*(Math.max(1,names.length)*slot+.6)),sampleRate);
    const measure={peakScheduled:0,sourcesCreated:0,rejectedVoices:0},bus=makeBus(ctx,.30,measure);
    names.forEach((name,i)=>{bus.sources.clear();if(!cue(bus,name,{},i*slot+.03))throw new Error('Unknown audio cue: '+name);});
    const rendered=await ctx.startRendering();
    return {sampleRate:rendered.sampleRate,channels:[new Float32Array(rendered.getChannelData(0))],...measure};
  }
  return {unlock,playCard,playEvent,playCue,playEncounter,setMuted,setVolume,getState,preview,profile,
    profiles:Object.freeze(Object.keys(PROFILES)),assassinProfiles:Object.freeze(Object.keys(PROFILES).filter(id=>id.startsWith('C'))),
    swordProfiles:Object.freeze(Object.keys(PROFILES).filter(id=>id.startsWith('S'))),sovereignProfiles:Object.freeze(Object.keys(PROFILES).filter(id=>id.startsWith('F'))),
    encounters:Object.freeze(Object.keys(ENCOUNTERS)),renderOffline,renderEncountersOffline,renderCuesOffline};
});
