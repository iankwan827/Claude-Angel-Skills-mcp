/**
 * bazi_interpreter.js - 八字特征检测
 * 根据词汇表规则检测命盘特征
 */

// =============================================
// 特征检测器
// =============================================

class BaziInterpreter {
    constructor(ctx) {
        this.ctx = ctx;
        this.features = [];
    }

    /**
     * 检测所有特征
     * @returns {string[]} 特征列表
     */
    detectAll() {
        this.features = [];
        this._detectStrength();
        this._detectStatus();
        this._detectCombinations();
        this._detectSpecialPatterns();
        this._detectXiYong();
        this._detectShenSha();
        return this.features;
    }

    // =============================================
    // 一、强度类检测
    // =============================================

    _detectStrength() {
        this.ctx.shishenResults.forEach(result => {
            const shishen = result.shishen;
            const name = shishen.getName();
            const len = result.occurrences.length;

            // 过旺：旺 + 无制
            if (shishen.isWang === 1 && shishen.isShouZhi === 0) {
                this.features.push(`${name}过旺`);
            }

            // 过弱：弱 + 受制
            if (shishen.isWang === 0 && shishen.isShouZhi === 1) {
                this.features.push(`${name}过弱`);
            }

            // 过多：出现 >= 3
            if (len >= 3) {
                this.features.push(`${name}过多`);
            }

            // 重重：出现 = 2
            if (len === 2) {
                this.features.push(`${name}重重`);
            }

            // 旺相：旺
            if (shishen.isWang === 1) {
                this.features.push(`${name}旺相`);
            }
        });
    }

    // =============================================
    // 二、状态类检测
    // =============================================

    _detectStatus() {
        this.ctx.shishenResults.forEach(result => {
            const shishen = result.shishen;
            const name = shishen.getName();
            const exists = shishen.exists;

            // 透干：天干有 + 地支有
            if (exists[0] === 1 && exists[1] === 1) {
                this.features.push(`${name}透干`);
            }

            // 虚浮：只有天干有
            if (exists[0] === 1 && exists[1] === 0) {
                this.features.push(`${name}虚浮`);
            }

            // 藏干：只有地支有
            if (exists[0] === 0 && exists[1] === 1) {
                this.features.push(`${name}藏干`);
            }

            // 透干有根
            if (exists[0] === 1 && exists[1] === 1) {
                this.features.push(`${name}透干有根`);
            }

            // 透干无根
            if (exists[0] === 1 && exists[1] === 0) {
                this.features.push(`${name}透干无根`);
            }

            // 旺相透干
            if (shishen.isWang === 1 && exists[0] === 1 && exists[1] === 1) {
                this.features.push(`${name}旺相透干`);
            }
        });

        // 空亡检测
        this._detectKongWang();

        // 入库/出墓检测
        this._detectMuKu();
    }

    _detectKongWang() {
        // 日支kongWang数组
        const dayZhiKongWang = this.ctx.dayZhi.kongWang || [];
        
        // 年支、月支、时支
        const yearZhi = this.ctx.yearZhi;
        const monthZhi = this.ctx.monthZhi;
        const hourZhi = this.ctx.hourZhi;

        // 年/月/时支：检查自己的地支名是否在日支的kongWang数组里
        const checkKongWang = (zhi, name) => {
            if (dayZhiKongWang.includes(zhi.name)) {
                this.features.push(`${name}空亡`);
            }
        };

        checkKongWang(yearZhi, '年支');
        checkKongWang(monthZhi, '月支');
        checkKongWang(hourZhi, '时支');

        // 日支：检查自己的地支名是否在年/月/时支的kongWang数组并集里
        const otherKongWang = [
            ...(yearZhi.kongWang || []),
            ...(monthZhi.kongWang || []),
            ...(hourZhi.kongWang || [])
        ];
        if (otherKongWang.includes(this.ctx.dayZhi.name)) {
            this.features.push('日支空亡');
        }
    }

    _detectMuKu() {
        // 十天干墓库表
        const MU_KU = {
            '甲': '未', '乙': '戌', '丙': '戌', '丁': '丑',
            '戊': '辰', '己': '丑', '庚': '丑', '辛': '辰',
            '壬': '辰', '癸': '戌'
        };

        // 检查入库：天干进入自己的墓库
        const gans = this.ctx.getAllGans();
        gans.forEach(gan => {
            const mu = MU_KU[gan.name];
            const zhis = this.ctx.getAllZhis();
            if (zhis.some(z => z.name === mu)) {
                this.features.push(`${gan.name}入库`);
            }
        });
    }

    // =============================================
    // 三、十神组合类检测
    // =============================================

    _detectCombinations() {
        // 官杀混杂：七杀 + 正官同时透干
        const hasQiSha = this._hasShishen('七杀');
        const hasZhengGuan = this._hasShishen('正官');
        if (hasQiSha && hasZhengGuan) {
            this.features.push('官杀混杂');
        }

        // 并见/重叠：同一十神出现 = 2
        this.ctx.shishenResults.forEach(result => {
            if (result.occurrences.length === 2) {
                this.features.push(`${result.shishen.getName()}并见`);
                this.features.push(`${result.shishen.getName()}重叠`);
            }
        });

        // 食神伤官组合
        if (this._hasShishen('食神') && this._hasShishen('伤官')) {
            this.features.push('食神伤官');
        }

        // 正财偏财组合
        if (this._hasShishen('正财') && this._hasShishen('偏财')) {
            this.features.push('正财偏财');
        }

        // 比肩劫财组合
        if (this._hasShishen('比肩') && this._hasShishen('劫财')) {
            this.features.push('比肩劫财');
        }

        // 官印相生
        this._detectXiangSheng('官星', '印星', '官印相生');

        // 食伤生财
        this._detectXiangSheng('食伤', '财星', '食伤生财');
    }

    _hasShishen(name) {
        return this.ctx.shishenResults.some(r => 
            r.shishen.getName() === name && r.shishen.exists[0] === 1
        );
    }

    _isAdjacent(pillar1, pillar2) {
        const pairs = [
            [0, 1], [2, 3], [4, 5], [6, 7],  // 同柱相邻
            [1, 3], [3, 5], [5, 7]              // 隔柱相邻
        ];
        return pairs.some(([a, b]) => 
            (pillar1 === a && pillar2 === b) || 
            (pillar1 === b && pillar2 === a)
        );
    }

    _detectXiangSheng(category1, category2, featureName) {
        // 简化版本：检查两类十神是否存在且相邻
        // 实际应检查官星和印星是否在相邻位置
        const cat1Shishen = this.ctx.shishenResults.filter(r => 
            this._isShishenCategory(r.shishen.getName(), category1)
        );
        const cat2Shishen = this.ctx.shishenResults.filter(r => 
            this._isShishenCategory(r.shishen.getName(), category2)
        );

        if (cat1Shishen.length === 0 || cat2Shishen.length === 0) return;

        // 检查是否有相邻的
        for (const c1 of cat1Shishen) {
            for (const c2 of cat2Shishen) {
                for (const occ1 of c1.occurrences) {
                    for (const occ2 of c2.occurrences) {
                        if (this._isAdjacent(occ1.pillar, occ2.pillar)) {
                            this.features.push(featureName);
                            return;
                        }
                    }
                }
            }
        }
    }

    _isShishenCategory(name, category) {
        const map = {
            '官星': ['七杀', '正官'],
            '印星': ['偏印', '正印'],
            '财星': ['偏财', '正财'],
            '食伤': ['食神', '伤官']
        };
        return map[category]?.includes(name) || false;
    }

    // =============================================
    // 四、特殊格局检测
    // =============================================

    _detectSpecialPatterns() {
        // 水火既济：丙火透干 + 壬水透干
        const hasBingHuo = this._hasGan('丙');
        const hasRenShui = this._hasGan('壬');
        if (hasBingHuo && hasRenShui) {
            this.features.push('水火既济');
        }

        // 木火通明：甲木透干 + 丙火透干
        const hasJiaMu = this._hasGan('甲');
        if (hasJiaMu && hasBingHuo) {
            this.features.push('木火通明');
        }

        // 金白水清：辛金日主 + 壬水透干 + 地支有金根
        const dayMaster = this.ctx.dayMaster.name;
        if (dayMaster === '辛' && hasRenShui && this._hasMetalRoot()) {
            this.features.push('金白水清');
        }

        // 身旺食伤泄秀
        const bodyStrength = this.ctx.bodyStrength || {};
        const isShenQiang = bodyStrength.level?.includes('强');
        if (isShenQiang) {
            const hasBiJie = this._hasShishen('比肩') || this._hasShishen('劫财');
            const hasShiShang = this._hasShishen('食神') || this._hasShishen('伤官');
            if (hasBiJie && hasShiShang) {
                this.features.push('身旺食伤泄秀');
            }
        }

        // 身弱官杀
        const isShenRuo = bodyStrength.level?.includes('弱');
        if (isShenRuo) {
            const hasGuanSha = this._hasShishen('七杀') || this._hasShishen('正官');
            if (hasGuanSha) {
                this.features.push('身弱官杀');
            }
        }

        // 财多身弱
        if (isShenRuo) {
            const hasCai = this._hasShishen('偏财') || this._hasShishen('正财');
            if (hasCai) {
                this.features.push('财多身弱');
            }
        }
    }

    _hasGan(name) {
        return this.ctx.pillars.some(p => 
            p.type === '天干' && p.name === name
        );
    }

    _hasMetalRoot() {
        const metalZhi = ['申', '酉'];
        return this.ctx.getAllZhis().some(z => metalZhi.includes(z.name));
    }

    // =============================================
    // 五、喜忌神类检测
    // =============================================

    _detectXiYong() {
        this.ctx.shishenResults.forEach(result => {
            const shishen = result.shishen;
            const name = shishen.getName();
            const xiYong = shishen.xiYong;

            if (xiYong === '忌') {
                this.features.push(`${name}为忌`);
            }
            if (xiYong === '用') {
                this.features.push(`${name}为用`);
            }
        });

        // 旺而无制
        this.ctx.shishenResults.forEach(result => {
            if (result.shishen.isWang === 1 && result.shishen.isShouZhi === 0) {
                this.features.push(`${result.shishen.getName()}旺而无制`);
            }
        });

        // 弱而受制
        this.ctx.shishenResults.forEach(result => {
            if (result.shishen.isWang === 0 && result.shishen.isShouZhi === 1) {
                this.features.push(`${result.shishen.getName()}弱而受制`);
            }
        });
    }

    // =============================================
    // 六、神煞类检测
    // =============================================

    _detectShenSha() {
        const zhis = this.ctx.getAllZhis();
        const zhiNames = ['年支', '月支', '日支', '时支'];
        
        zhis.forEach((zhi, idx) => {
            const shenSha = zhi.shenSha || [];
            shenSha.forEach(sha => {
                this.features.push(`${zhiNames[idx]}${sha}`);
            });
        });
    }
}

// =============================================
// 导出
// =============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaziInterpreter };
}
