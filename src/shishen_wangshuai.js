/**
 * shishen_wangshuai.js - 十神旺衰判断
 * 根据十神旺衰文档实现完整的旺衰判断逻辑
 */

// 天干映射表（用于获取五行）
const GAN_MAP = {
    '甲': { wx: '木' },
    '乙': { wx: '木' },
    '丙': { wx: '火' },
    '丁': { wx: '火' },
    '戊': { wx: '土' },
    '己': { wx: '土' },
    '庚': { wx: '金' },
    '辛': { wx: '金' },
    '壬': { wx: '水' },
    '癸': { wx: '水' }
};

// 禄刃表：天干对应的本气通根地支
const LU_YIN_TABLE = {
    '甲': { lu: '寅', yin: '卯' },
    '乙': { lu: '卯', yin: '寅' },
    '丙': { lu: '巳', yin: '午' },
    '丁': { lu: '午', yin: '巳' },
    '戊': { lu: '巳', yin: '午' },
    '己': { lu: '午', yin: '巳' },
    '庚': { lu: '申', yin: '酉' },
    '辛': { lu: '酉', yin: '申' },
    '壬': { lu: '亥', yin: '子' },
    '癸': { lu: '子', yin: '亥' }
};

// 通根表：天干可通根的地支
// 本气通根（同五行）
const TONG_GEN_BEN = {
    '木': ['寅', '卯'],
    '火': ['巳', '午'],
    '土': ['辰', '戌', '丑', '未'],
    '金': ['申', '酉'],
    '水': ['子', '亥']
};

// 中气余气通根
const TONG_GEN_ZHONG = {
    '木': ['亥', '未'],
    '火': ['寅', '戌'],
    '土': ['申', '子'],
    '金': ['子', '辰'],
    '水': ['卯', '巳']
};

// 地支六冲表
const ZHICHONG_TABLE = [
    ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'],
    ['辰', '戌'], ['巳', '亥']
];

// 地支相刑表
const XING_TABLE = [
    ['寅', '巳', '申'],  // 寅刑巳、巳刑申、申刑寅（无礼之刑）
    ['丑', '戌'],        // 丑戌相刑
    ['子', '卯']         // 子卯相刑（淫荡之刑）
];

// 地支六合表
const HE_TABLE = [
    ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'],
    ['巳', '申'], ['午', '未']
];

// =============================================
// ShishenWangShuaiCalculator（十神旺衰计算器）
// =============================================

class ShishenWangShuaiCalculator {
    /**
     * 计算所有十神的旺衰
     * @param {Array} shishenResults - 十神结果数组
     * @param {Zhi[]} zhis - 四个地支 [年支, 月支, 日支, 时支]
     * @param {Gan[]} pillars - pillars数组（天干+地支交错）
     * @param {Object} bodyStrength - 身强身弱结果 { level, score, percentage }
     */
    static calculateAll(shishenResults, zhis, pillars, bodyStrength) {
        const yueLingWx = zhis[1].wx;  // 月令五行

        shishenResults.forEach(result => {
            const shishen = result.shishen;

            // 1. 得月令（旺相休囚死）
            const yueLingWang = shishen.calculateWang(yueLingWx);
            const wangRelation = shishen.getWangRelation(yueLingWx);

            // 2. 本柱通根/禄/刃
            const benTongGen = this._hasBenTongGen(shishen.name, zhis);

            // 3. 原局本气根数量
            const benQiRoots = this._countBenQiRoots(shishen.name, zhis);

            // 4. 原局中气根数量
            const zhongQiRoots = this._countZhongQiRoots(shishen.name, zhis);

            // 综合判断旺衰
            // 旺的条件：得月令 OR 本柱通根 OR 至少一个本气根 OR 至少两个中气根
            const isWang = yueLingWang || benTongGen || benQiRoots >= 1 || zhongQiRoots >= 2;
            shishen.isWang = isWang ? 1 : 0;

            // 计算受制状态
            shishen.isShouZhi = this._calculateShouZhi(shishen, zhis, pillars);

            // 计算喜用忌闲
            shishen.xiYong = this._calculateXiYong(shishen, bodyStrength);
        });
    }

    /**
     * 判断是否有本柱通根
     * 本柱通根 = 天干作为本气出现在任何地支的藏干中
     * @param {string} ganName - 天干名
     * @param {Zhi[]} zhis - 四个地支
     * @returns {boolean}
     */
    static _hasBenTongGen(ganName, zhis) {
        for (const zhi of zhis) {
            const mainGan = zhi.getMainStem();
            if (mainGan && mainGan.name === ganName) {
                return true;
            }
            const middleGan = zhi.getMiddleStem();
            if (middleGan && middleGan.name === ganName) {
                return true;
            }
            const remainderGan = zhi.getRemainderStem();
            if (remainderGan && remainderGan.name === ganName) {
                return true;
            }
        }
        return false;
    }

    /**
     * 统计本气根数量
     * 统计该天干作为本气出现在地支藏干中的次数
     * @param {string} ganName - 天干名
     * @param {Zhi[]} zhis - 四个地支
     * @returns {number}
     */
    static _countBenQiRoots(ganName, zhis) {
        let count = 0;
        for (const zhi of zhis) {
            const mainGan = zhi.getMainStem();
            if (mainGan && mainGan.name === ganName) {
                count++;
            }
        }
        return count;
    }

    /**
     * 统计中气根数量
     * 统计该天干作为中气出现在地支藏干中的次数
     * @param {string} ganName - 天干名
     * @param {Zhi[]} zhis - 四个地支
     * @returns {number}
     */
    static _countZhongQiRoots(ganName, zhis) {
        let count = 0;
        for (const zhi of zhis) {
            const middleGan = zhi.getMiddleStem();
            if (middleGan && middleGan.name === ganName) {
                count++;
            }
            const remainderGan = zhi.getRemainderStem();
            if (remainderGan && remainderGan.name === ganName) {
                count++;
            }
        }
        return count;
    }

    /**
     * 计算受制状态
     * 制：克、冲、刑、合伴、合化
     * @param {Shishen} shishen
     * @param {Zhi[]} zhis - 四个地支
     * @param {Gan[]} pillars - pillars数组
     * @returns {number} 0=不受制, 1=受制
     */
    static _calculateShouZhi(shishen, zhis, pillars) {
        const shishenName = shishen.name;

        for (const zhi of zhis) {
            const hiddenNames = zhi.hiddenGans.map(h => h.name);
            if (!hiddenNames.includes(shishenName)) continue;

            const zhiPosition = zhi.pillarIndex;

            // === 情况1：检查同柱的天干是否克该地支（邻居克）===
            const ganPosition = zhiPosition - 1;
            if (ganPosition >= 0 && pillars[ganPosition]) {
                const gan = pillars[ganPosition];
                if (this._isKe(gan.wx, zhi.wx)) {
                    return 1;
                }
            }

            // === 情况2：检查其他地支与该地支的冲、刑、合关系 ===
            for (const otherZhi of zhis) {
                if (otherZhi.name === zhi.name) continue;

                if (this._isChong(otherZhi.name, zhi.name)) {
                    return 1;
                }
                if (this._isXing(otherZhi.name, zhi.name)) {
                    return 1;
                }
                if (this._isHe(otherZhi.name, zhi.name)) {
                    return 1;
                }
            }
        }

        return 0;
    }

    /**
     * 判断五行是否相克
     * @param {string} keWx - 克方五行
     * @param {string} beiWx - 被克方五行
     * @returns {boolean}
     */
    static _isKe(keWx, beiWx) {
        if (keWx === '木' && beiWx === '土') return true;
        if (keWx === '火' && beiWx === '金') return true;
        if (keWx === '土' && beiWx === '水') return true;
        if (keWx === '金' && beiWx === '木') return true;
        if (keWx === '水' && beiWx === '火') return true;
        return false;
    }

    /**
     * 判断是否相冲
     * @param {string} zhi1
     * @param {string} zhi2
     * @returns {boolean}
     */
    static _isChong(zhi1, zhi2) {
        for (const [a, b] of ZHICHONG_TABLE) {
            if ((zhi1 === a && zhi2 === b) || (zhi1 === b && zhi2 === a)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断是否相刑
     * @param {string} zhi1
     * @param {string} zhi2
     * @returns {boolean}
     */
    static _isXing(zhi1, zhi2) {
        for (const group of XING_TABLE) {
            if (group.includes(zhi1) && group.includes(zhi2)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断是否相合（合伴）
     * @param {string} zhi1
     * @param {string} zhi2
     * @returns {boolean}
     */
    static _isHe(zhi1, zhi2) {
        for (const [a, b] of HE_TABLE) {
            if ((zhi1 === a && zhi2 === b) || (zhi1 === b && zhi2 === a)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断五行是否相克
     * @param {string} keWx - 克方五行
     * @param {string} beiWx - 被克方五行
     * @returns {boolean}
     */
    static _isKe(keWx, beiWx) {
        // 木克土、火克金、土克水、金克木、水克火
        if (keWx === '木' && beiWx === '土') return true;
        if (keWx === '火' && beiWx === '金') return true;
        if (keWx === '土' && beiWx === '水') return true;
        if (keWx === '金' && beiWx === '木') return true;
        if (keWx === '水' && beiWx === '火') return true;
        return false;
    }

    /**
     * 计算喜用忌闲
     * 身强：官财食伤为用，印比劫为忌
     * 身弱：印比劫为用，官财食伤为忌
     * @param {Shishen} shishen
     * @param {Object} bodyStrength - 身强身弱结果
     * @returns {string} '喜'/'用'/'忌'/'闲'
     */
    static _calculateXiYong(shishen, bodyStrength) {
        const shishenName = shishen.getName();

        // 判断身强还是身弱
        const isShenQiang = bodyStrength.level.includes('强');

        // 十神分类
        const guanCaiShiShang = ['七杀', '正官', '偏财', '正财', '食神', '伤官'];
        const yinBiJie = ['偏印', '正印', '比肩', '劫财'];

        if (guanCaiShiShang.includes(shishenName)) {
            return isShenQiang ? '用' : '忌';
        } else if (yinBiJie.includes(shishenName)) {
            return isShenQiang ? '忌' : '用';
        }

        return '闲';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShishenWangShuaiCalculator };
}
