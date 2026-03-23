/**
 * shishen_geshi.js - 十神格局分析
 * 计算财官印相生、比肩食伤生财等格局
 */

// 十神分类
const SHISHEN_CATEGORY = {
    guanSha: ['七杀', '正官'],      // 官星
    yin: ['偏印', '正印'],          // 印星
    cai: ['偏财', '正财'],          // 财星
    shiShang: ['食神', '伤官'],     // 食伤
    biJie: ['比肩', '劫财']         // 比劫
};

// =============================================
// ShishenGeshiCalculator（十神格局计算器）
// =============================================

class ShishenGeshiCalculator {
    /**
     * 计算十神格局
     * @param {Array} shishenResults - 十神结果数组
     * @returns {Object} 格局分析结果
     */
    static calculate(shishenResults) {
        const result = {
            patterns: [],
            caiGuanYin: null,
            biJieShiShangCai: null,
            details: []
        };

        // 查找各类十神
        const cai = this._findShishen(shishenResults, ['偏财', '正财']);
        const guan = this._findShishen(shishenResults, ['七杀', '正官']);
        const yin = this._findShishen(shishenResults, ['偏印', '正印']);
        const biJie = this._findShishen(shishenResults, ['比肩', '劫财']);
        const shiShang = this._findShishen(shishenResults, ['食神', '伤官']);

        // 判断财官印相生：财→官→印
        const caiGuanYinChain = this._checkXiangShengChain(cai, guan, yin);
        if (caiGuanYinChain.matched) {
            result.patterns.push('财官印相生');
            result.caiGuanYin = caiGuanYinChain;
        }

        // 判断比肩食伤生财：比劫→食伤→财
        const biJieShiShangCaiChain = this._checkXiangShengChain(biJie, shiShang, cai);
        if (biJieShiShangCaiChain.matched) {
            result.patterns.push('比肩食伤生财');
            result.biJieShiShangCai = biJieShiShangCaiChain;
        }

        result.details.push(caiGuanYinChain);
        result.details.push(biJieShiShangCaiChain);

        return result;
    }

    /**
     * 查找指定类型的十神
     * @param {Array} shishenResults - 十神结果数组
     * @param {Array} names - 十神名称数组
     * @returns {Object|null}
     */
    static _findShishen(shishenResults, names) {
        return shishenResults.find(r => {
            if (!names.includes(r.shishen.getName())) return false;
            return this._hasBenQiOccurrence(r);
        }) || null;
    }

    /**
     * 检查十神是否有天干或本气的出现
     * @param {Object} shishenResult - shishenResult 条目
     * @returns {boolean}
     */
    static _hasBenQiOccurrence(shishenResult) {
        if (!shishenResult.occurrences) return false;
        for (const occ of shishenResult.occurrences) {
            // role 为 null 表示天干
            // role 为 "本气" 表示地支本气
            if (occ.role === null || occ.role === '本气') {
                return true;
            }
        }
        return false;
    }

    /**
     * 检查三神是否形成相生链条
     * 条件1: s1生s2（五行相生）
     * 条件2: s2生s3（五行相生）
     * 条件3: s1、s2、s3的位置必须相邻（s1相邻s2，s2相邻s3）
     * @param {Object} s1 - 生者（第一神）
     * @param {Object} s2 - 被生者（第二神）
     * @param {Object} s3 - 被生者（第三神）
     * @returns {Object} { matched: boolean, s1: shishen, s2: shishen, s3: shishen, reason: string }
     */
    static _checkXiangShengChain(s1, s2, s3) {
        if (!s1 || !s2 || !s3) {
            return { matched: false, s1: null, s2: null, s3: null, reason: '缺少必要十神' };
        }

        const shishen1 = s1.shishen;
        const shishen2 = s2.shishen;
        const shishen3 = s3.shishen;

        // 检查 s1 → s2 五行相生
        const relation1to2 = shishen1.getRelationTo(shishen2);
        const s1ToS2 = relation1to2 === '生' || relation1to2 === '被生';

        // 检查 s2 → s3 五行相生
        const relation2to3 = shishen2.getRelationTo(shishen3);
        const s2ToS3 = relation2to3 === '生' || relation2to3 === '被生';

        // 检查位置相邻
        const pos1 = this._getShishenPositions(s1);
        const pos2 = this._getShishenPositions(s2);
        const pos3 = this._getShishenPositions(s3);

        // 检查 pos1 是否与 pos2 相邻
        const isAdjacent12 = this._checkAdjacent(pos1, pos2);
        // 检查 pos2 是否与 pos3 相邻
        const isAdjacent23 = this._checkAdjacent(pos2, pos3);

        if (s1ToS2 && s2ToS3 && isAdjacent12 && isAdjacent23) {
            const chain = `${shishen1.name}→${shishen2.name}→${shishen3.name}`;
            return {
                matched: true,
                s1: shishen1,
                s2: shishen2,
                s3: shishen3,
                reason: `形成${chain}相生链条（位置相邻）`
            };
        }

        // 提供不匹配的原因
        let reason = '';
        if (!s1ToS2) {
            reason = `${shishen1.name}不生${shishen2.name}（五行关系：${relation1to2 || '无'}）`;
        } else if (!s2ToS3) {
            reason = `${shishen2.name}不生${shishen3.name}（五行关系：${relation2to3 || '无'}）`;
        } else if (!isAdjacent12) {
            reason = `${shishen1.name}与${shishen2.name}位置不相邻`;
        } else {
            reason = `${shishen2.name}与${shishen3.name}位置不相邻`;
        }

        return { matched: false, s1: shishen1, s2: shishen2, s3: shishen3, reason };
    }

    /**
     * 获取十神的位置数组（从天干和本气的occurrences中获取pillar位置）
     * @param {Object} shishenResult - shishenResult条目
     * @returns {Array} pillar位置数组
     */
    static _getShishenPositions(shishenResult) {
        const positions = [];
        if (!shishenResult.occurrences) return positions;

        for (const occ of shishenResult.occurrences) {
            // 只获取天干(null)和本气的位置
            if (occ.role === null || occ.role === '本气') {
                positions.push(occ.pillar);
            }
        }
        return positions;
    }

    /**
     * 检查两组位置是否有相邻关系
     * @param {Array} positions1 - 位置数组1
     * @param {Array} positions2 - 位置数组2
     * @returns {boolean}
     */
    static _checkAdjacent(positions1, positions2) {
        for (const p1 of positions1) {
            for (const p2 of positions2) {
                if (this._isAdjacentPillar(p1, p2)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 判断两个pillar位置是否相邻
     * 注意：occurrences里的pillar是pillars数组索引(0-7)
     * pillars数组索引: 0=年干,1=年支,2=月干,3=月支,4=日干,5=日支,6=时干,7=时支
     * @param {number} p1 - pillars数组索引(0-7)
     * @param {number} p2 - pillars数组索引(0-7)
     * @returns {boolean}
     */
    static _isAdjacentPillar(p1, p2) {
        // 同一pillars索引算相邻（如天干和同柱的本气藏干）
        if (p1 === p2) return true;

        // pillars数组相邻关系
        // 同柱相邻: 0-1(年干-年支), 2-3(月干-月支), 4-5(日干-日支), 6-7(时干-时支)
        // 隔柱相邻: 1-3(年支-月支), 3-5(月支-日支), 5-7(日支-时支)
        const adjacentPairs = [
            [0, 1], [2, 3], [4, 5], [6, 7],  // 同柱相邻
            [1, 3], [3, 5], [5, 7]            // 隔柱相邻(地支与地支)
        ];
        return adjacentPairs.some(([a, b]) => (p1 === a && p2 === b) || (p1 === b && p2 === a));
    }

    /**
     * 获取格局描述
     * @param {Object} chainResult - _checkXiangShengChain 返回的结果
     * @returns {string}
     */
    static getPatternDescription(chainResult) {
        if (chainResult.matched) {
            return chainResult.reason;
        }
        return chainResult.reason || '未形成相生格局';
    }

    // =============================================
    // 六柱格局计算（大运+流年）
    // =============================================

    /**
     * 计算六柱格局（原局四柱 + 当前大运 + 当前流年）
     * @param {Array} shishenResults - 十神结果数组
     * @param {Array} pillars - 原局pillars数组
     * @param {Gan[]} gans - 四个天干
     * @param {Zhi[]} zhis - 四个地支
     * @param {Object} currentDaYun - 当前大运数据
     * @param {Object} currentLiuNian - 当前流年数据
     * @param {Gan} GanClass - Gan类
     * @param {Zhi} ZhiClass - Zhi类
     * @returns {Object} 格局分析结果
     */
    static calculateSixPillars(shishenResults, pillars, gans, zhis, currentDaYun, currentLiuNian, GanClass, ZhiClass) {
        if (!currentDaYun || !currentLiuNian) {
            return this.calculate(shishenResults);
        }

        // 创建大运和流年柱
        const dayunGan = new GanClass(currentDaYun.gan, 8);
        dayunGan.isDaYun = 1;
        dayunGan.shishen = currentDaYun.tenGod;

        const dayunZhi = new ZhiClass(currentDaYun.zhi, 9);
        dayunZhi.isDaYun = 1;

        const liunianGan = new GanClass(currentLiuNian.gan, 10);
        liunianGan.isLiuNian = 1;
        liunianGan.shishen = currentLiuNian.tenGod;

        const liunianZhi = new ZhiClass(currentLiuNian.zhi, 11);
        liunianZhi.isLiuNian = 1;

        // 构建六柱数组
        const sixPillars = [
            pillars[0], pillars[1], pillars[2], pillars[3],
            pillars[4], pillars[5], pillars[6], pillars[7],
            dayunGan, dayunZhi, liunianGan, liunianZhi
        ];

        // 查找各类十神
        const cai = this._findShishenInSixPillars(sixPillars, ['偏财', '正财'], shishenResults);
        const guan = this._findShishenInSixPillars(sixPillars, ['七杀', '正官'], shishenResults);
        const yin = this._findShishenInSixPillars(sixPillars, ['偏印', '正印'], shishenResults);
        const biJie = this._findShishenInSixPillars(sixPillars, ['比肩', '劫财'], shishenResults);
        const shiShang = this._findShishenInSixPillars(sixPillars, ['食神', '伤官'], shishenResults);

        const result = {
            patterns: [],
            caiGuanYin: null,
            biJieShiShangCai: null,
            details: []
        };

        // 判断财官印相生
        const caiGuanYinChain = this._checkSixPillarChain(cai, guan, yin, sixPillars);
        if (caiGuanYinChain.matched) {
            result.patterns.push('财官印相生');
            result.caiGuanYin = caiGuanYinChain;
        }

        // 判断比肩食伤生财
        const biJieShiShangCaiChain = this._checkSixPillarChain(biJie, shiShang, cai, sixPillars);
        if (biJieShiShangCaiChain.matched) {
            result.patterns.push('比肩食伤生财');
            result.biJieShiShangCai = biJieShiShangCaiChain;
        }

        result.details.push(caiGuanYinChain);
        result.details.push(biJieShiShangCaiChain);

        return result;
    }

    /**
     * 在六柱中查找指定十神
     * @param {Array} sixPillars - 六柱数组
     * @param {Array} names - 十神名称数组
     * @param {Array} shishenResults - 原局shishenResults
     * @returns {Object|null}
     */
    static _findShishenInSixPillars(sixPillars, names, shishenResults) {
        const original = shishenResults.find(r => {
            if (!names.includes(r.shishen.getName())) return false;
            return this._hasBenQiOccurrence(r);
        });

        const dayunGan = sixPillars[8];
        const liunianGan = sixPillars[10];

        const positions = [];

        if (original) {
            for (const occ of original.occurrences) {
                if (occ.role === null || occ.role === '本气') {
                    positions.push({ pillar: occ.pillar, gan: original.shishen });
                }
            }
        }

        if (dayunGan && names.includes(dayunGan.shishen)) {
            positions.push({ pillar: 8, gan: dayunGan });
        }

        if (liunianGan && names.includes(liunianGan.shishen)) {
            positions.push({ pillar: 10, gan: liunianGan });
        }

        if (positions.length === 0) return null;

        return {
            shishen: positions[0].gan,
            positions: positions.map(p => p.pillar)
        };
    }

    /**
     * 检查六柱中的三神是否形成相生链条
     * @param {Object} s1 - 生者
     * @param {Object} s2 - 被生者
     * @param {Object} s3 - 被生者
     * @param {Array} sixPillars - 六柱数组
     * @returns {Object}
     */
    static _checkSixPillarChain(s1, s2, s3, sixPillars) {
        if (!s1 || !s2 || !s3) {
            return { matched: false, s1: null, s2: null, s3: null, reason: '缺少必要十神' };
        }

        const shishen1 = s1.shishen;
        const shishen2 = s2.shishen;
        const shishen3 = s3.shishen;
        const pos1 = s1.positions;
        const pos2 = s2.positions;
        const pos3 = s3.positions;

        // 检查 s1 → s2 五行相生
        const relation1to2 = shishen1.getRelationTo(shishen2);
        const s1ToS2 = relation1to2 === '生' || relation1to2 === '被生';

        // 检查 s2 → s3 五行相生
        const relation2to3 = shishen2.getRelationTo(shishen3);
        const s2ToS3 = relation2to3 === '生' || relation2to3 === '被生';

        // 检查位置相邻
        const isAdjacent12 = this._checkAdjacentSixPillar(pos1, pos2, sixPillars);
        const isAdjacent23 = this._checkAdjacentSixPillar(pos2, pos3, sixPillars);

        if (s1ToS2 && s2ToS3 && isAdjacent12 && isAdjacent23) {
            const chain = `${shishen1.name}→${shishen2.name}→${shishen3.name}`;
            return {
                matched: true,
                s1: shishen1,
                s2: shishen2,
                s3: shishen3,
                reason: `形成${chain}相生链条（六柱相邻）`
            };
        }

        // 提供不匹配的原因
        let reason = '';
        if (!s1ToS2) {
            reason = `${shishen1.name}不生${shishen2.name}（五行关系：${relation1to2 || '无'}）`;
        } else if (!s2ToS3) {
            reason = `${shishen2.name}不生${shishen3.name}（五行关系：${relation2to3 || '无'}）`;
        } else if (!isAdjacent12) {
            reason = `${shishen1.name}与${shishen2.name}位置不相邻`;
        } else {
            reason = `${shishen2.name}与${shishen3.name}位置不相邻`;
        }

        return { matched: false, s1: shishen1, s2: shishen2, s3: shishen3, reason };
    }

    /**
     * 检查六柱中两组位置是否有相邻关系
     * @param {Array} positions1 - 位置数组1
     * @param {Array} positions2 - 位置数组2
     * @param {Array} sixPillars - 六柱数组
     * @returns {boolean}
     */
    static _checkAdjacentSixPillar(positions1, positions2, sixPillars) {
        for (const p1 of positions1) {
            for (const p2 of positions2) {
                if (this._isAdjacentInSixPillars(p1, p2, sixPillars)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 判断六柱中两个位置是否相邻
     * 大运(8,9)和流年(10,11)与原局所有柱(0-7)都相邻
     * @param {number} p1 - 位置索引
     * @param {number} p2 - 位置索引
     * @param {Array} sixPillars - 六柱数组
     * @returns {boolean}
     */
    static _isAdjacentInSixPillars(p1, p2, sixPillars) {
        // 同一位置算相邻
        if (p1 === p2) return true;

        // 大运/流年柱与原局所有柱都相邻
        const pillar1 = sixPillars[p1];
        const pillar2 = sixPillars[p2];

        if (pillar1 && (pillar1.isDaYun === 1 || pillar1.isLiuNian === 1)) {
            return p2 >= 0 && p2 <= 7;
        }
        if (pillar2 && (pillar2.isDaYun === 1 || pillar2.isLiuNian === 1)) {
            return p1 >= 0 && p1 <= 7;
        }

        // 原局柱之间的相邻关系
        return this._isAdjacentPillar(p1, p2);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShishenGeshiCalculator, SHISHEN_CATEGORY };
}
