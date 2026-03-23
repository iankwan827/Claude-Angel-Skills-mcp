/**
 * shishen_pingke.js - 十神性格特征
 * 根据八字用神与性格特征文档实现性格判断
 */

// 十神分类
const SHISHEN_CATEGORY = {
    guanSha: ['七杀', '正官'],      // 官星 —— 守法
    yin: ['偏印', '正印'],          // 印星 —— 仁慈
    cai: ['偏财', '正财'],          // 财星 —— 勤勉
    shiShang: ['食神', '伤官'],     // 食伤 —— 才华
    biJie: ['比肩', '劫财']         // 比劫 —— 义气
};

// 性格特征详细表（按文档逐行写入）
// 属性说明：
// - xiYong: '用'/'忌'
// - isWang: true=旺, false=衰
// - isShouZhi: true=受制, false=不受制
// - isFengSheng: true=逢生, false=不逢生
// - isPositive: true=正面特征, false=负面特征
const PINGKE_TABLE = {
    guanSha: {
        name: '官星',
        trait: '守法',
        // 文档: "用神为官杀，官杀旺而逢生" → 只检查 xiYong=用, isWang=true, isFengSheng=true
        //       "忌神为官杀，官杀弱而受制" → 只检查 xiYong=忌, isWang=false, isShouZhi=true
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, isPositive: true, description: '刚直不阿、秉公执法、责任心强、锐意进取、具有君子之风' },
            { xiYong: '忌', isWang: false, isShouZhi: true, isPositive: true, description: '刚直不阿、秉公执法、责任心强、锐意进取、具有君子之风' },
            { xiYong: '用', isWang: false, isShouZhi: true, isPositive: false, description: '行为不轨、违法之徒、不思进取、顶撞领导、当为小人' },
            { xiYong: '忌', isWang: true, isFengSheng: true, isPositive: false, description: '行为不轨、违法之徒、不思进取、顶撞领导、当为小人' }
        ]
    },
    yin: {
        name: '印星',
        trait: '仁慈',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, isPositive: true, description: '仁慈宽厚、宽以待人、体恤亲朋、智力超群、文才卓然' },
            { xiYong: '忌', isWang: false, isShouZhi: true, isPositive: true, description: '仁慈宽厚、宽以待人、体恤亲朋、智力超群、文才卓然' },
            { xiYong: '用', isWang: false, isShouZhi: true, isPositive: false, description: '心胸狭窄、做事狠毒、目光短浅、性格多疑、感情用事、傻大粗黑' },
            { xiYong: '忌', isWang: true, isFengSheng: true, isPositive: false, description: '心胸狭窄、做事狠毒、目光短浅、性格多疑、感情用事、傻大粗黑' }
        ]
    },
    cai: {
        name: '财星',
        trait: '勤勉',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, isPositive: true, description: '勤勉能干、性格温和、古道热肠、仗义疏财、思想纯正' },
            { xiYong: '忌', isWang: false, isShouZhi: true, isPositive: true, description: '勤勉能干、性格温和、古道热肠、仗义疏财、思想纯正' },
            { xiYong: '用', isWang: false, isShouZhi: true, isPositive: false, description: '懒惰、小气吝啬、头脑僵化、性格暴躁、喜信谗言' },
            { xiYong: '忌', isWang: true, isFengSheng: true, isPositive: false, description: '懒惰、小气吝啬、头脑僵化、性格暴躁、喜信谗言' }
        ]
    },
    shiShang: {
        name: '食伤',
        trait: '才华',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, isPositive: true, description: '气质高雅、思想脱俗、反应灵敏、风流潇洒、才华横溢、聪明伶俐、能言善道、多才多艺、适应力强、有艺术天赋' },
            { xiYong: '忌', isWang: false, isShouZhi: true, isPositive: true, description: '气质高雅、思想脱俗、反应灵敏、风流潇洒、才华横溢、聪明伶俐、能言善道、多才多艺、适应力强、有艺术天赋' },
            { xiYong: '用', isWang: false, isShouZhi: true, isPositive: false, description: '自命不凡、郁郁寡欢、喜欢空想、行为诡秘、易遭挫折' },
            { xiYong: '忌', isWang: true, isFengSheng: true, isPositive: false, description: '自命不凡、郁郁寡欢、喜欢空想、行为诡秘、易遭挫折' }
        ]
    },
    biJie: {
        name: '比劫',
        trait: '义气',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, isPositive: true, description: '意志坚定、为人豪惠，事直自重、邻里友好、内外团结' },
            { xiYong: '忌', isWang: false, isShouZhi: true, isPositive: true, description: '意志坚定、为人豪惠，事直自重、邻里友好、内外团结' },
            { xiYong: '用', isWang: false, isShouZhi: true, isPositive: false, description: '刻板固执、自以为是、兄弟失合、一生操劳' },
            { xiYong: '忌', isWang: true, isFengSheng: true, isPositive: false, description: '刻板固执、自以为是、兄弟失合、一生操劳' }
        ]
    }
};

// =============================================
// ShishenPingKeCalculator（十神性格计算器）
// =============================================

class ShishenPingKeCalculator {
    /**
     * 计算所有十神的性格特征
     * @param {Array} shishenResults - 十神结果数组
     * @param {Array} pillars - pillars数组
     * @returns {Array} 性格特征数组
     */
    static calculateAll(shishenResults, pillars) {
        const results = [];

        shishenResults.forEach(result => {
            const shishen = result.shishen;
            const shishenName = shishen.getName();
            const xiYong = shishen.xiYong;
            const isWang = shishen.isWang === 1;
            const isShouZhi = shishen.isShouZhi === 1;

            // 获取十神所在的天干位置
            const ganPosition = this._getGanPosition(result);
            const isFengSheng = this._checkFengSheng(ganPosition, pillars);

            // 判断性格特征
            const category = this._getCategory(shishenName);
            if (category) {
                const pingKe = this._determinePingKe(category, xiYong, isWang, isShouZhi, isFengSheng);
                results.push({
                    shishen: shishenName,
                    category: PINGKE_TABLE[category].name,
                    trait: PINGKE_TABLE[category].trait,
                    isWang: isWang,
                    isShouZhi: isShouZhi,
                    isFengSheng: isFengSheng,
                    pingKe: pingKe
                });
            }
        });

        return results;
    }

    /**
     * 从 shishenResult 获取天干位置
     * @param {Object} result - shishenResult 条目
     * @returns {number} 天干位置 (0-7)
     */
    static _getGanPosition(result) {
        for (const occ of result.occurrences) {
            if (occ.occurs[0] === 1) {
                return occ.pillar * 2;
            }
        }
        if (result.occurrences.length > 0) {
            const occ = result.occurrences[0];
            return occ.pillar * 2 + 1;
        }
        return -1;
    }

    /**
     * 检查十神是否逢生
     * @param {number} ganIndex - 天干索引
     * @param {Array} pillars - pillars数组
     * @returns {boolean}
     */
    static _checkFengSheng(ganIndex, pillars) {
        const positions = this._getShishenPositions(ganIndex, pillars);
        if (positions.length === 0) return false;

        for (const pos of positions) {
            const pillar = pillars[pos];
            if (!pillar) continue;

            const adjacentPositions = pillar.getAdjacentPositions();

            for (const adjPos of adjacentPositions) {
                const other = pillars[adjPos];
                if (!other || other.type !== '天干') continue;

                const relation = other.getRelationTo(pillar);
                if (relation === '生' || relation === '被生') {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 获取十神所在的所有位置
     * @param {number} ganIndex - 天干索引
     * @param {Array} pillars - pillars数组
     * @returns {Array} 位置数组
     */
    static _getShishenPositions(ganIndex, pillars) {
        const ganName = pillars[ganIndex]?.name;
        if (!ganName) return [ganIndex];

        const positions = [ganIndex];

        for (let i = 0; i < pillars.length; i++) {
            const pillar = pillars[i];
            if (pillar.type !== '地支') continue;

            for (const hiddenGan of pillar.hiddenGans) {
                if (hiddenGan.name === ganName) {
                    positions.push(pillar.pillarIndex);
                }
            }
        }

        return positions;
    }

    /**
     * 获取十神分类
     * @param {string} shishenName
     * @returns {string|null}
     */
    static _getCategory(shishenName) {
        for (const [key, names] of Object.entries(SHISHEN_CATEGORY)) {
            if (names.includes(shishenName)) {
                return key;
            }
        }
        return null;
    }

    /**
     * 判断性格特征
     * 根据文档"旺而逢生"等条件，只匹配条件中明确指定的字段，忽略其他字段
     * @param {string} category - 十神分类
     * @param {string} xiYong - '用'/'忌'
     * @param {boolean} isWang - 是否旺
     * @param {boolean} isShouZhi - 是否受制
     * @param {boolean} isFengSheng - 是否逢生
     * @returns {Object} { isPositive: boolean, description: string }
     */
    static _determinePingKe(category, xiYong, isWang, isShouZhi, isFengSheng) {
        const info = PINGKE_TABLE[category];
        if (!info || !info.conditions) {
            return { isPositive: null, description: '' };
        }

        // 只匹配条件中明确指定的字段
        for (const cond of info.conditions) {
            // xiYong 必须匹配
            if (cond.xiYong !== xiYong) continue;

            // 检查条件中定义的其他字段
            // 条件中定义了 isWang 才检查
            if (cond.hasOwnProperty('isWang') && cond.isWang !== isWang) continue;
            // 条件中定义了 isShouZhi 才检查
            if (cond.hasOwnProperty('isShouZhi') && cond.isShouZhi !== isShouZhi) continue;
            // 条件中定义了 isFengSheng 才检查
            if (cond.hasOwnProperty('isFengSheng') && cond.isFengSheng !== isFengSheng) continue;

            // 所有条件中定义的字段都匹配
            return { isPositive: cond.isPositive, description: cond.description };
        }

        return { isPositive: null, description: '' };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShishenPingKeCalculator, PINGKE_TABLE, SHISHEN_CATEGORY };
}