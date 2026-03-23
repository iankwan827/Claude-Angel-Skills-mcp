#!/usr/bin/env node
/**
 * bazi.js - 八字命理完整排盘入口
 * 串联: paipan_node_input → paipan_node_core → bazi_classes → 
 *       shishen_wangshuai → shishen_geshi → shishen_pingke
 * 
 * 用法: node bazi.js <日期> <时间> <性别> [--lunar]
 * 例:  node bazi.js 1990-08-27 12:00 男
 *      node bazi.js 1990-08-27 12:00 女 --lunar
 */

const path = require('path');

// 加载排盘核心
const paipan = require('./paipan_node_core.js');

// 加载数据层
const { Gan, Zhi, Shishen, ShishenCalculator } = require('./bazi_classes.js');

// 加载分析层
const { ShishenWangShuaiCalculator } = require('./shishen_wangshuai.js');
const { ShishenGeshiCalculator } = require('./shishen_geshi.js');
const { ShishenPingKeCalculator } = require('./shishen_pingke.js');

// =============================================
// 数据输入
// =============================================

function parseArgs(args) {
    if (args.length < 3) {
        console.log('用法: node bazi.js <生日> <时间> <性别> [--lunar]');
        console.log('例: node bazi.js 1990-08-27 12:00 男');
        console.log('   node bazi.js 1990-08-27 12:00 女 --lunar  (农历生日)');
        process.exit(1);
    }

    // 检查农历模式
    let offset = 0;
    let isLunar = false;
    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--lunar') {
            isLunar = true;
            offset = i - 2;
            break;
        }
    }

    const dateStr = args[2];
    const timeStr = args[3] || '12:00';
    const genderArg = args[4 - offset] || args[3];
    const gender = genderArg?.includes('女') ? 'F' : 'M';

    // 解析日期
    let year, month, day;
    const dateMatch = dateStr.match(/(\d+)[\年\-](\d+)[\月\-](\d+)/);
    if (dateMatch) {
        year = parseInt(dateMatch[1]);
        month = parseInt(dateMatch[2]);
        day = parseInt(dateMatch[3]);
    } else {
        console.log('日期格式错误，请使用: 1990-01-01 或 1990年1月1日');
        process.exit(1);
    }

    // 解析时间
    let hour = 12, minute = 0;
    const timeMatch = timeStr.match(/(\d+):(\d+)/);
    if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minute = parseInt(timeMatch[2]);
    } else {
        const hourMatch = timeStr.match(/(\d+)/);
        if (hourMatch) hour = parseInt(hourMatch[1]);
    }

    return { year, month, day, hour, minute, gender, isLunar };
}

// =============================================
// 主函数
// =============================================

function main() {
    const { year, month, day, hour, minute, gender, isLunar } = parseArgs(process.argv);

    // ---- 1. 排盘 ----
    let dateObj;
    if (isLunar) {
        const lunar = paipan.Lunar.fromYmd(year, month, day);
        const solar = lunar.getSolar();
        dateObj = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), hour, minute);
    } else {
        dateObj = new Date(year, month - 1, day, hour, minute);
    }

    const bazi = paipan.calculateBazi(dateObj, gender);
    const pillarsData = bazi.pillars;

    console.log('\n================================================================');
    console.log('                      八字命理排盘                           ');
    console.log('================================================================\n');

    // ---- 2. 构造型实例 ----
    // pillars 数组索引: 0=年干,1=年支,2=月干,3=月支,4=日干,5=日支,6=时干,7=时支
    const pillarsInstance = [
        new Gan(pillarsData[0].gan, 0),  // 0
        new Zhi(pillarsData[0].zhi, 1),   // 1
        new Gan(pillarsData[1].gan, 2),  // 2
        new Zhi(pillarsData[1].zhi, 3),   // 3
        new Gan(pillarsData[2].gan, 4),  // 4 (日干/日元)
        new Zhi(pillarsData[2].zhi, 5),  // 5
        new Gan(pillarsData[3].gan, 6),  // 6
        new Zhi(pillarsData[3].zhi, 7),  // 7
    ];

    // 为每个 Zhi 设置藏干十神
    pillarsInstance.forEach((p, i) => {
        if (p instanceof Zhi && pillarsData[Math.floor(i / 2)].hidden) {
            p.setupHiddenShishen(pillarsData[Math.floor(i / 2)].hidden);
        }
    });

    const gans = [pillarsInstance[0], pillarsInstance[2], pillarsInstance[4], pillarsInstance[6]];
    const zhis = [pillarsInstance[1], pillarsInstance[3], pillarsInstance[5], pillarsInstance[7]];
    const dayMaster = gans[2];  // 日干是日元

    // ---- 3. 计算十神 ----
    const shishenResults = ShishenCalculator.calculateAll(dayMaster, gans, zhis, pillarsData);

    // ---- 4. 计算旺衰 ----
    const bodyStrength = bazi.bodyStrength;
    ShishenWangShuaiCalculator.calculateAll(shishenResults, zhis, pillarsInstance, bodyStrength);

    // ---- 5. 计算格局 ----
    const geshiResult = ShishenGeshiCalculator.calculate(shishenResults);

    // ---- 6. 计算性格 ----
    const pingkeResult = ShishenPingKeCalculator.calculateAll(shishenResults, pillarsInstance);

    // ============================================
    // 输出：四柱排盘
    // ============================================
    console.log('【四柱排盘】\n');
    const labels = ['年柱', '月柱', '日柱', '时柱'];
    pillarsData.forEach((p, i) => {
        const tenGod = p.tenGod === '元男' || p.tenGod === '元女' ? '' : `(${p.tenGod})`;
        console.log(`${labels[i]}: ${p.gan}${p.zhi} ${tenGod}`.trim() + `  纳音: ${p.naYin}`);
        if (p.hidden && p.hidden.length > 0) {
            const hiddenStr = p.hidden.map(h => `${h.stem}(${h.god})`).join(', ');
            console.log(`       藏干: ${hiddenStr}`);
        }
        if (p.shenSha && p.shenSha.length > 0) {
            console.log(`       神煞: ${p.shenSha.join(', ')}`);
        }
        console.log('');
    });

    // ============================================
    // 输出：基本信息
    // ============================================
    console.log('【基本信息】\n');
    console.log(`公历: ${bazi.solarDate || (year + '-' + month + '-' + day)}`);
    if (bazi.lunarDate) console.log(`农历: ${bazi.lunarDate}`);
    console.log(`性别: ${gender === 'F' ? '女' : '男'}`);
    console.log(`日主: ${dayMaster.name} (${dayMaster.wx}性, ${dayMaster.yinyang})`);
    console.log(`身强身弱: ${bodyStrength.level} (${bodyStrength.percentage.toFixed(1)}%)`);
    if (bodyStrength.isGuanYin) console.log(`格局: 官印局`);
    console.log('');

    // ============================================
    // 输出：十神旺衰
    // ============================================
    console.log('【十神旺衰受制】\n');
    shishenResults.forEach(result => {
        const shishen = result.shishen;
        const name = shishen.getName();
        const wang = shishen.isWang === 1 ? '旺' : '衰';
        const shouZhi = shishen.isShouZhi === 1 ? '受制' : '不受制';
        const xiYong = shishen.xiYong || '';
        const status = shishen.getTouGanStatus();
        const statusMap = { 0: '虚浮', 1: '藏干不透', 2: '透干' };
        console.log(`${name}: ${wang} | ${shouZhi} | 喜忌=${xiYong} | ${statusMap[status] || ''}`);
    });
    console.log('');

    // ============================================
    // 输出：性格特征
    // ============================================
    console.log('【性格特征】\n');
    pingkeResult.forEach(pk => {
        const posNeg = pk.pingKe?.isPositive === true ? '✓正面' : (pk.pingKe?.isPositive === false ? '✗负面' : '○中性');
        console.log(`${pk.shishen}（${pk.category}）: ${posNeg}`);
        if (pk.pingKe?.description) {
            console.log(`  ${pk.pingKe.description}`);
        }
    });
    console.log('');

    // ============================================
    // 输出：十神格局
    // ============================================
    console.log('【十神格局】\n');
    if (geshiResult.patterns.length > 0) {
        geshiResult.patterns.forEach(p => console.log(`★ ${p}`));
    } else {
        console.log('（无明显格局）');
    }
    console.log('');

    // 格局明细
    if (geshiResult.caiGuanYin) {
        const cgy = geshiResult.caiGuanYin;
        console.log(`财官印相生: ${cgy.matched ? '★ 匹配! ' + cgy.reason : '✗ 未形成 - ' + cgy.reason}`);
    }
    if (geshiResult.biJieShiShangCai) {
        const bjss = geshiResult.biJieShiShangCai;
        console.log(`比肩食伤生财: ${bjss.matched ? '★ 匹配! ' + bjss.reason : '✗ 未形成 - ' + bjss.reason}`);
    }
    console.log('');

    // ============================================
    // 输出：大运流年
    // ============================================
    if (bazi.daYunList && bazi.daYunList.length > 0) {
        console.log('【大运流年】\n');
        bazi.daYunList.forEach(dy => {
            console.log(`${dy.startAge}岁 (${dy.startYear}年): ${dy.gan}${dy.zhi} - ${dy.tenGod}`);
        });
        console.log('');
    }

    console.log('================================================================\n');
}

main();
