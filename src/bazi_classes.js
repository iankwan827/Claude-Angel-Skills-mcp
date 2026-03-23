/**
 * bazi_classes.js - 八字面向对象数据层
 * 从 paipan_result.js 的 calculateBazi() 接收数据，填充类属性
 */

// =============================================
// 常量定义（保留用于数据表）
// =============================================

const WX = { JIN: '金', MU: '木', SHUI: '水', HUO: '火', TU: '土' };

const GAN_MAP = {
    '甲': { wx: '木', yinyang: '阳', order: 1 },
    '乙': { wx: '木', yinyang: '阴', order: 2 },
    '丙': { wx: '火', yinyang: '阳', order: 3 },
    '丁': { wx: '火', yinyang: '阴', order: 4 },
    '戊': { wx: '土', yinyang: '阳', order: 5 },
    '己': { wx: '土', yinyang: '阴', order: 6 },
    '庚': { wx: '金', yinyang: '阳', order: 7 },
    '辛': { wx: '金', yinyang: '阴', order: 8 },
    '壬': { wx: '水', yinyang: '阳', order: 9 },
    '癸': { wx: '水', yinyang: '阴', order: 10 }
};

const ZHI_MAP = {
    '子': { wx: '水', yinyang: '阳', hiddenStems: ['癸'] },
    '丑': { wx: '土', yinyang: '阴', hiddenStems: ['己', '癸', '辛'] },
    '寅': { wx: '木', yinyang: '阳', hiddenStems: ['甲', '丙', '戊'] },
    '卯': { wx: '木', yinyang: '阴', hiddenStems: ['乙'] },
    '辰': { wx: '土', yinyang: '阳', hiddenStems: ['戊', '乙', '癸'] },
    '巳': { wx: '火', yinyang: '阴', hiddenStems: ['丙', '庚', '戊'] },
    '午': { wx: '火', yinyang: '阳', hiddenStems: ['丁', '己'] },
    '未': { wx: '土', yinyang: '阴', hiddenStems: ['己', '丁', '乙'] },
    '申': { wx: '金', yinyang: '阳', hiddenStems: ['庚', '壬', '戊'] },
    '酉': { wx: '金', yinyang: '阴', hiddenStems: ['辛'] },
    '戌': { wx: '土', yinyang: '阳', hiddenStems: ['戊', '辛', '丁'] },
    '亥': { wx: '水', yinyang: '阴', hiddenStems: ['壬', '甲'] }
};

// =============================================
// Element（五行基类）
// =============================================

class Element {
    // 五行属性（静态）
    static WX_ORDER = ['木', '火', '土', '金', '水'];         // 旺相休囚死顺序
    static WX_SHENG_ORDER = ['金', '水', '木', '火', '土'];   // 相生顺序：金生水、水生木、木生火、火生土、土生金
    static WX_KE_ORDER = ['金', '木', '土', '水', '火'];     // 相克顺序：金克木、木克土、土克水、水克火、火克金

    constructor(name, wx, yinyang) {
        this.name = name;
        this.wx = wx;
        this.yinyang = yinyang;
    }

    getElement() { return this.wx; }
    isYang() { return this.yinyang === '阳'; }
    isYin() { return this.yinyang === '阴'; }

    getRelationTo(other) {
        if (this.wx === other.wx) return '同';

        const shengIdx = Element.WX_SHENG_ORDER.indexOf(this.wx);
        // 检查 this 生 other
        if (Element.WX_SHENG_ORDER[(shengIdx + 1) % 5] === other.wx) return '生';
        if (Element.WX_SHENG_ORDER[(shengIdx + 2) % 5] === other.wx) return '生';

        // 检查 other 生 this（我被生）
        const otherShengIdx = Element.WX_SHENG_ORDER.indexOf(other.wx);
        if (Element.WX_SHENG_ORDER[(otherShengIdx + 1) % 5] === this.wx) return '被生';
        if (Element.WX_SHENG_ORDER[(otherShengIdx + 2) % 5] === this.wx) return '被生';

        const keIdx = Element.WX_KE_ORDER.indexOf(this.wx);
        // 检查 this 克 other
        if (Element.WX_KE_ORDER[(keIdx + 1) % 5] === other.wx) return '克';

        // 检查 other 克 this（我被克）
        const otherKeIdx = Element.WX_KE_ORDER.indexOf(other.wx);
        if (Element.WX_KE_ORDER[(otherKeIdx + 1) % 5] === this.wx) return '被克';

        return null;
    }

    static getWxIndex(wx) {
        return Element.WX_ORDER.indexOf(wx);
    }

    // 旺相休囚死
    getWangRelation(yueLingWx) {
        if (this.wx === yueLingWx) return '旺';

        const myIdx = Element.WX_ORDER.indexOf(this.wx);
        const yueIdx = Element.WX_ORDER.indexOf(yueLingWx);

        const diff = (myIdx - yueIdx + 5) % 5;
        const relations = { 1: '相', 2: '死', 3: '囚', 4: '休' };
        return relations[diff];
    }
}

// =============================================
// Gan（天干类）
// =============================================

class Gan extends Element {
    constructor(name, pillarIndex) {
        const data = GAN_MAP[name];
        if (!data) throw new Error(`未知天干: ${name}`);
        super(name, data.wx, data.yinyang);
        this.order = data.order;
        this.type = '天干';
        this.pillarIndex = pillarIndex;  // 0=年干, 2=月干, 4=日干, 6=时干
        this._shishen = null;  // 关联属性：藏干的十神
        this._hiddenRole = null;  // 关联属性：藏干角色 '本气'、'中气'、'余气'
        this._zhiName = null;  // 关联属性：藏干所在的地支名称
        this.isDaYun = 0;  // 大运柱开关：1=大运柱，与原局所有柱相邻
        this.isLiuNian = 0;  // 流年柱开关：1=流年柱，与原局所有柱相邻
    }

    // 获取藏干角色（关联属性）
    getHiddenRole() { return this._hiddenRole; }

    // 获取藏干所在的地支名称（关联属性）
    getZhiName() { return this._zhiName; }

    getOrder() { return this.order; }

    // 获取十神（关联属性）
    getShishen() { return this._shishen; }

    isSameYinYang(other) {
        return this.yinyang === other.yinyang;
    }

    getPillarName() {
        const names = ['年', '月', '日', '时'];
        return names[this.pillarIndex / 2];
    }

    isAdjacent(otherPillarIndex) {
        // 如果自己是大运/流年柱（开关为1），与原局所有柱都相邻
        if (this.isDaYun === 1 || this.isLiuNian === 1) {
            return otherPillarIndex >= 0 && otherPillarIndex <= 7;
        }

        // 中气和余气没有临柱判断
        const role = this._hiddenRole;
        if (role === '中气' || role === '余气') {
            return false;
        }

        if (this.pillarIndex === otherPillarIndex) return false;

        const thisPair = Math.floor(this.pillarIndex / 2);
        const otherPair = Math.floor(otherPillarIndex / 2);

        if (thisPair === otherPair) {
            return Math.abs(this.pillarIndex - otherPillarIndex) === 1;
        }

        const adjacentPairs = [[0,2], [2,0], [2,4], [4,2], [4,6], [6,4]];
        return adjacentPairs.some(([a, b]) => a === this.pillarIndex && b === otherPillarIndex);
    }

    getAdjacentPositions() {
        const adjacent = [];
        for (let i = 0; i < 8; i++) {
            if (i !== this.pillarIndex && this.isAdjacent(i)) {
                adjacent.push(i);
            }
        }
        return adjacent;
    }
}

// =============================================
// Zhi（地支类）
// =============================================

class Zhi extends Element {
    constructor(name, pillarIndex) {
        const data = ZHI_MAP[name];
        if (!data) throw new Error(`未知地支: ${name}`);
        super(name, data.wx, data.yinyang);
        this.type = '地支';
        this.pillarIndex = pillarIndex;  // 1=年支, 3=月支, 5=日支, 7=时支

        // 藏干 = 天干数组（关联属性模式：十神通过 _shishen 动态关联，角色通过 _hiddenRole 动态关联，地支通过 _zhiName 动态关联）
        this.hiddenGans = data.hiddenStems.map((s, i) => {
            const gan = new Gan(s, -1);
            gan._hiddenRole = i === 0 ? '本气' : (i === 1 ? '中气' : '余气');
            gan._zhiName = name;  // 藏干所在的地支名称
            return gan;
        });

        // 排盘数据（由BaziContext填充）
        this.naYin = '';
        this.kongWang = [];
        this.shenSha = [];

        // 地支关系
        this.chongWith = null;
        this.heWith = null;
        this.haiWith = null;
        this.poWith = null;
        this.xingWith = null;

        // 大运/流年柱开关
        this.isDaYun = 0;  // 大运柱开关：1=大运柱，与原局所有柱相邻
        this.isLiuNian = 0;  // 流年柱开关：1=流年柱，与原局所有柱相邻
        this.isKongWang = 0;  // 空亡开关：1=空亡（由分析层在判断时设置）
    }

    /**
     * 设置藏干的十神（从排盘数据）
     * @param {Array} hiddenData - 排盘数据中的藏干数组 [{stem, god, type}, ...]
     */
    setupHiddenShishen(hiddenData) {
        this.hiddenGans.forEach((hgan, i) => {
            if (hiddenData[i]) {
                hgan._shishen = hiddenData[i].god || '';
            }
        });
    }

    getMainStem() { return this.hiddenGans[0]; }
    getMiddleStem() { return this.hiddenGans[1] || null; }
    getRemainderStem() { return this.hiddenGans[2] || null; }
    getAllHiddenGans() { return this.hiddenGans; }

    // 获取藏干及其十神
    getAllHiddenGansWithShishen() {
        return this.hiddenGans.map(gan => ({
            gan: gan.name,
            shishen: gan.getShishen()
        }));
    }

    getPillarName() {
        const names = ['年', '月', '日', '时'];
        return names[(this.pillarIndex - 1) / 2];
    }

    isAdjacent(otherPillarIndex) {
        // 如果自己是大运/流年柱（开关为1），与原局所有柱都相邻
        if (this.isDaYun === 1 || this.isLiuNian === 1) {
            return otherPillarIndex >= 0 && otherPillarIndex <= 7;
        }

        if (this.pillarIndex === otherPillarIndex) return false;

        const thisPair = Math.floor(this.pillarIndex / 2);
        const otherPair = Math.floor(otherPillarIndex / 2);

        if (thisPair === otherPair) {
            return Math.abs(this.pillarIndex - otherPillarIndex) === 1;
        }

        const adjacentPairs = [[1,3], [3,1], [3,5], [5,3], [5,7], [7,5]];
        return adjacentPairs.some(([a, b]) => a === this.pillarIndex && b === otherPillarIndex);
    }

    getAdjacentPositions() {
        const adjacent = [];
        for (let i = 0; i < 8; i++) {
            if (i !== this.pillarIndex && this.isAdjacent(i)) {
                adjacent.push(i);
            }
        }
        return adjacent;
    }

    isChong(other) {
        const chongPairs = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
        const pair = [this.name, other.name].sort().join('');
        return chongPairs.some(p => p.sort().join('') === pair);
    }

    isHe(other) {
        const hePairs = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
        const pair = [this.name, other.name].sort().join('');
        return hePairs.some(p => p.sort().join('') === pair);
    }
}

// =============================================
// Shishen（十神/日元类）继承 Gan
// =============================================

class Shishen extends Gan {
    constructor(name, relationToDayMaster) {
        super(name, -1);  // pillarIndex 固定为 -1，因为十神可能出现在多个位置
        this.relationToDayMaster = relationToDayMaster;

        // [天干存在, 藏干存在]
        // 判断：[1,0]=虚浮, [0,1]=藏着不透, [1,1]=透干
        this.exists = [0, 0];

        // 出现位置数组
        // 每个元素: { pillar: 0/1/2/3, occurs: [天干存在, 藏干存在], role: '本气'/'中气'/'余气' }
        // pillar: 0=年, 1=月, 2=日, 3=时
        // occurs: [1,0]=天干, [0,1]=藏干
        this.occurrences = [];

        // 旺衰和受制状态
        this.isWang = 0;     // 0=衰, 1=旺
        this.isShouZhi = 0;  // 0=不受制, 1=受制

        // 喜用忌闲（由分析层逻辑判断后赋值）
        this.xiYong = null;  // '喜'/'用'/'忌'/'闲'
    }

    getName() { return this.relationToDayMaster; }
    isDayMaster() { return this.relationToDayMaster === '元男' || this.relationToDayMaster === '元女'; }

    // 获取透干状态
    // 返回：0=虚浮(只有天干), 1=藏着不透(只有藏干), 2=透干, -1=不存在
    getTouGanStatus() {
        if (this.exists[0] === 1 && this.exists[1] === 0) return 0;  // 虚浮
        if (this.exists[0] === 0 && this.exists[1] === 1) return 1;  // 藏着不透
        if (this.exists[0] === 1 && this.exists[1] === 1) return 2;  // 透干
        return -1;  // 不存在
    }

    // 根据月令五行计算旺衰
    // yueLingWx: 月令五行（木/火/土/金/水）
    // 旺相休囚死中，旺和相算旺(isWang=1)，休囚死算衰(isWang=0)
    calculateWang(yueLingWx) {
        const relation = this.getWangRelation(yueLingWx);
        this.isWang = (relation === '旺' || relation === '相') ? 1 : 0;
        return this.isWang;
    }
}

// =============================================
// ShishenCalculator（十神计算器）
// =============================================

class ShishenCalculator {
    /**
     * 计算十神关系（备用，如果排盘数据没有十神则使用此方法）
     * 实际上排盘已经计算好了十神，直接用就行
     */
    static calculate(dayMaster, otherGan) {
        // 只有日干位置(pillarIndex=4)的天干才是元男/元女
        if (otherGan.pillarIndex === 4) {
            return dayMaster.isYang() ? '元男' : '元女';
        }

        const sameYin = dayMaster.isYang() === otherGan.isYang();
        const relation = dayMaster.getRelationTo(otherGan);

        if (!relation) return null;

        switch (relation) {
            case '生': return sameYin ? '食神' : '伤官';
            case '克': return sameYin ? '偏财' : '正财';
            case '被生': return sameYin ? '偏印' : '正印';
            case '被克': return sameYin ? '七杀' : '正官';
            case '同': return sameYin ? '比肩' : '劫财';
            default: return null;
        }
    }

    /**
     * 从排盘数据直接获取十神（优先使用）
     * processed pillars 中每个 pillar 已经有 tenGod 字段
     */
    static fromProcessedPillar(pillar, pillarIndex) {
        // pillar.tenGod 来自排盘计算
        const tenGod = pillar.tenGod || '';
        return new Shishen(pillar.gan, pillarIndex * 2, tenGod);
    }

    /**
     * 计算所有十神结果
     * @param {Gan} dayMaster - 日干（Shishen对象继承自Gan）
     * @param {Gan[]} gans - 四个天干 [年干, 月干, 日干, 时干]
     * @param {Zhi[]} zhis - 四个地支 [年支, 月支, 日支, 时支]
     * @param {Object[]} processedPillars - 排盘结果中的pillars数组
     * @returns {Array} shishenResults数组
     */
    static calculateAll(dayMaster, gans, zhis, processedPillars) {
        const results = [];

        // Map: 十神名称 -> { shishen: Shishen, occurrences: [], exists: [0, 0] }
        const shishenMap = new Map();

        // 遍历天干（年干、月干、日干、时干）
        gans.forEach((gan, pillarIdx) => {
            const tenGod = processedPillars[pillarIdx].tenGod || '';
            // 跳过元男/元女（日干自己，不是十神）
            if (!tenGod || tenGod === '元男' || tenGod === '元女') return;

            if (!shishenMap.has(tenGod)) {
                shishenMap.set(tenGod, {
                    ganName: gan.name,
                    shishen: new Shishen(gan.name, tenGod),
                    occurrences: []
                });
            }

            const entry = shishenMap.get(tenGod);
            // 天干出现
            entry.shishen.exists[0] = 1;
            // 添加 occurrence
            entry.shishen.occurrences.push({
                pillar: pillarIdx,  // 0=年, 1=月, 2=日, 3=时
                occurs: [1, 0],  // 天干
                role: null
            });
        });

        // 遍历藏干
        zhis.forEach((zhi, idx) => {
            // 设置藏干十神
            // zhi.pillarIndex 是实际位置 (1=年支, 3=月支, 5=日支, 7=时支)
            const hiddenData = processedPillars[idx].hidden || [];
            zhi.setupHiddenShishen(hiddenData);

            zhi.hiddenGans.forEach((hiddenGan) => {
                const tenGod = hiddenGan.getShishen();
                if (!tenGod) return;

                if (!shishenMap.has(tenGod)) {
                    shishenMap.set(tenGod, {
                        ganName: hiddenGan.name,
                        shishen: new Shishen(hiddenGan.name, tenGod),
                        occurrences: []
                    });
                }

                const entry = shishenMap.get(tenGod);
                // 藏干出现
                entry.shishen.exists[1] = 1;
                // 添加 occurrence
                entry.shishen.occurrences.push({
                    pillar: zhi.pillarIndex,  // pillars数组索引: 1=年支, 3=月支, 5=日支, 7=时支
                    occurs: [0, 1],  // 藏干
                    role: hiddenGan.getHiddenRole()  // 本气/中气/余气
                });
            });
        });

        // 计算所有十神的旺衰（根据月令）
        const yueLingWx = zhis[1].wx;  // 月支的五行就是月令
        shishenMap.forEach((entry) => {
            entry.shishen.calculateWang(yueLingWx);
        });

        // 转换为结果数组
        shishenMap.forEach((entry) => {
            results.push({
                ganName: entry.ganName,
                shishen: entry.shishen,
                occurrences: entry.shishen.occurrences,
                exists: entry.shishen.exists
            });
        });

        return results;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Gan, Zhi, Shishen, ShishenCalculator, Element };
}
