import test from 'node:test';
import assert from 'node:assert/strict';

import { renderPosterHtml } from '../src/render/poster.js';

const sampleContent = {
  breed: '雪纳瑞',
  species: 'dog',
  title: '雪纳瑞演化与特色',
  subtitle: '从德国工作犬到家庭伴侣',
  timeline: [
    { label: '起源阶段', period: '19世纪', text: '19世纪德国农场守卫与捕鼠工作犬' },
    { label: '发展阶段', period: '1890年代', text: '逐渐在欧洲扩散，体型标准化' },
    { label: '品种确立', period: '20世纪初', text: '进入犬种注册体系' },
    { label: '认可阶段', period: '1920年代', text: '标准进一步固定' },
    { label: '现代阶段', period: '现代', text: '成为全球受欢迎家庭伴侣犬' }
  ],
  summary: '雪纳瑞从德国工作犬逐渐进入家庭生活。',
  keyPoints: ['工作犬', '体型标准化', '品种确立', '走向世界', '家庭伴侣'],
  traits: ['聪明', '警觉', '活泼', '适应力强', '伴侣犬'],
  careTips: ['定期修剪被毛', '保持稳定运动', '重视社会化训练', '关注牙齿清洁'],
  suitableFor: ['有陪伴时间的家庭', '喜欢互动训练的人', '接受定期美容护理的人'],
  featureCards: [
    { label: '体型', text: '结构紧凑。' },
    { label: '被毛', text: '粗硬双层被毛。' },
    { label: '性格', text: '聪明警觉。' },
    { label: '用途', text: '从工作犬到伴侣犬。' }
  ],
  fact: '雪纳瑞的胡须是它最有辨识度的外观特征。',
  aliases: ['Schnauzer'],
  disclaimer: '内容仅作宠物科普参考。'
};

test('renderPosterHtml locks the TakPet logo and dog image assets into the poster', () => {
  const html = renderPosterHtml(sampleContent, { breedImagePath: 'assets/breed.png' });

  assert.match(html, /assets\/logo\.png/);
  assert.match(html, /assets\/breed\.png/);
  assert.match(html, /brand-logo/);
  assert.match(html, /timeline-grid/);
  assert.doesNotMatch(html, /生成Logo|重新绘制|image_gen/);
  assert.match(html, /雪纳瑞演化与特色/);
  assert.match(html, /雪纳瑞从德国工作犬逐渐进入家庭生活/);
  assert.match(html, /1080px/);
  assert.match(html, /1440px/);
});

test('renderPosterHtml does not reuse the TakPet logo as the breed image fallback', () => {
  const html = renderPosterHtml(sampleContent);

  assert.match(html, /assets\/logo\.png/);
  assert.doesNotMatch(html, /<img class="hero-photo" src="assets\/logo\.png"/);
  assert.match(html, /犬种图片待生成/);
});
