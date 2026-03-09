import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const enDir = path.join(ROOT, 'en');
if (!fs.existsSync(enDir)) fs.mkdirSync(enDir);
const aboutEnDir = path.join(enDir, 'about');
if (!fs.existsSync(aboutEnDir)) fs.mkdirSync(aboutEnDir, { recursive: true });

function translateIndex() {
  let content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  
  // SEO & Head
  content = content.replace('lang="zh-CN"', 'lang="en"');
  content = content.replace(/<title>.*?<\/title>/, '<title>AI Tech Observer — GPT-5.4 · Claude 4.6 · Gemini 3.1 Tech Blog</title>');
  content = content.replace(/content="专注 AI 大模型.*?经验。"/g, 'content="Focusing on AI foundation models and tech insights, covering GPT-5.4, Claude 4.6, and Gemini 3.1 Pro."');
  content = content.replace(/content="AI 大模型观察 — GPT-5.4 · Claude 4.6 · Gemini 3.1 技术博客"/g, 'content="AI Tech Observer — GPT-5.4 · Claude 4.6 · Gemini 3.1 Tech Blog"');
  content = content.replace('AI大模型,GPT,Claude,Gemini,提示工程,AI Agent,RAG,LLM', 'LLM, AI, GPT, Claude, Gemini, Prompt Engineering, AI Agent, RAG');
  content = content.replace(/"inLanguage": "zh-CN"/, '"inLanguage": "en"');
  content = content.replace(/"name": "AI 大模型观察"/, '"name": "AI Tech Observer"');
  content = content.replace(/"description": "专注 AI 大模型技术研究与实践的技术博客"/, '"description": "Tech blog focusing on AI foundation models research and practice"');

  // Hero
  content = content.replace('深入<span class="gradient-text">大模型</span>世界', 'Dive into the <span class="gradient-text">LLM</span> World');
  content = content.replace('关于 GPT-5.4、Claude 4.6、Gemini 3.1 的技术洞察与实践笔记', 'Tech insights and practice notes on GPT-5.4, Claude 4.6, Gemini 3.1');
  content = content.replace('浏览文章', 'Browse Articles');
  content = content.replace('了解更多', 'Learn More');
  content = content.replace('核心主题', 'Core Topics');
  content = content.replace('技术领域', 'Tech Focus');
  content = content.replace('前沿追踪', 'Frontier Tracking');

  // Sections
  content = content.replace('最新文章', 'Latest Articles');
  content = content.replace('探索我们在 AI 大模型领域的最新研究与实践记录。', 'Explore our latest research and practice logs in the LLM field.');
  content = content.replace(/>全部文章</g, '>All Articles<');
  content = content.replace('模型参数对齐', 'Model Specs Alignment');
  content = content.replace('主流闭源与开源大模型核心指标快览。', 'A quick glance at core metrics of mainstream closed and open-source models.');
  content = content.replace('查看完整对比', 'View Full Comparison');
  content = content.replace(/参数/g, 'Parameters');
  content = content.replace(/上下文/g, 'Context');
  content = content.replace('发布时间', 'Released');
  content = content.replace(/万亿/g, 'Trillion');
  content = content.replace(/千亿/g, 'Billion');

  content = content.replace('加入我们的技术邮件列表，获取最新的 AI 大模型研究报告与应用指南。', 'Join our technical mailing list to get the latest AI research reports and application guides.');
  content = content.replace('输入你的邮箱地址', 'Enter your email address');
  content = content.replace('订阅更新', 'Subscribe');

  fs.writeFileSync(path.join(enDir, 'index.html'), content, 'utf-8');
  console.log('Created en/index.html');
}

function translateAbout() {
  let content = fs.readFileSync(path.join(ROOT, 'about', 'index.html'), 'utf-8');
  
  content = content.replace('lang="zh-CN"', 'lang="en"');
  content = content.replace('<title>关于本站 — AI 大模型观察</title>', '<title>About Us — AI Tech Observer</title>');
  content = content.replace(/content="了解 AI 大模型观察的创建初衷与技术理念.*?分享。"/, 'content="Learn about the mission and tech philosophy of AI Tech Observer. Focusing on GPT-5.4, Claude 4.6, Gemini 3.1 Pro."');

  content = content.replace('关于本站', 'About Us');
  content = content.replace('一个专注于 AI 大模型领域的技术研究与实践分享平台', 'A tech research and practice sharing platform focusing on AI foundation models');
  
  content = content.replace('创建初衷', 'Our Mission');
  content = content.replace('内容方向', 'Content Focus');
  content = content.replace('提示工程', 'Prompt Engineering');
  content = content.replace('模型微调', 'Model Fine-tuning');
  content = content.replace('多模态 AI', 'Multimodal AI');
  content = content.replace('行业应用', 'Industry Apps');
  content = content.replace('关于作者', 'About the Author');
  
  content = content.replace('📊 站点数据', '📊 Site Stats');
  content = content.replace('技术文章', 'Tech Articles');
  content = content.replace('覆盖模型', 'Models Covered');
  content = content.replace('月读者', 'Monthly Readers');
  content = content.replace('🔗 友情链接', '🔗 Friends & Links');

  fs.writeFileSync(path.join(aboutEnDir, 'index.html'), content, 'utf-8');
  console.log('Created en/about/index.html');
}

function translateModels() {
  const modelsEnDir = path.join(enDir, 'models');
  if (!fs.existsSync(modelsEnDir)) fs.mkdirSync(modelsEnDir, { recursive: true });
  
  let content = fs.readFileSync(path.join(ROOT, 'models', 'index.html'), 'utf-8');
  
  content = content.replace('lang="zh-CN"', 'lang="en"');
  content = content.replace('<title>AI 模型对比 — GPT-5.4 vs Claude 4.6 vs Gemini 3.1 Pro | AI 大模型观察</title>', '<title>AI Model Comparison — GPT-5.4 vs Claude 4.6 vs Gemini 3.1 Pro | AI Tech Observer</title>');
  content = content.replace(/content="全面对比 2026 年三大顶级 AI 模型.*?适用场景。"/, 'content="Comprehensive comparison of top AI models in 2026: GPT-5.4, Claude Sonnet 4.6, Gemini 3.1 Pro."');

  content = content.replace('AI 模型全景对比', 'AI Model Landscape Snapshot');
  content = content.replace('深入了解 2026 年三大主流 AI 模型的能力边界与适用场景', 'Deep dive into the capabilities and use cases of top AI models in 2026');
  
  content = content.replace(/发布于/g, 'Released');
  
  content = content.replace('GPT-5.4 是 OpenAI 最新旗舰模型，包含标准版、<strong>GPT-5.4 Thinking</strong>（侧重深度推理）和 <strong>GPT-5.4 Pro</strong>（API 最高性能版）三个变体。整合了 GPT-5.3-Codex 的编程优势，支持 Computer Use 操作，在编程、推理和专业工作流方面表现卓越。', 'GPT-5.4 is OpenAI\'s latest flagship model, featuring Standard, <strong>GPT-5.4 Thinking</strong> (focused on deep reasoning), and <strong>GPT-5.4 Pro</strong> (API max performance). Integrated with GPT-5.3-Codex for code generation and Computer Use support, it excels in coding, reasoning, and professional workflows.');
  content = content.replace('Claude Sonnet 4.6 在速度与智能之间取得了绝佳平衡，是日常任务的最优选择。增强的编程能力和 Computer Use 功能使其成为开发者首选。同系列的 <strong>Claude Opus 4.6</strong>（2026.02.05）则是 Anthropic 最强大的模型，专攻复杂 Agent 任务和长期规划。', 'Claude Sonnet 4.6 strikes the perfect balance between speed and intelligence, making it the top choice for daily tasks. Enhanced coding and Computer Use make it a developer favorite. The <strong>Claude Opus 4.6</strong> is Anthropic\'s most powerful model for complex Agent tasks and long-term planning.');
  content = content.replace('Gemini 3.1 Pro 是 Google 最新的复杂问题解决模型，原生支持文本、图像、音频、视频和代码等多模态推理。拥有业界最大的 2M 上下文窗口，同系列的 <strong>Gemini 3.1 Flash-Lite</strong>（2026.03.03）引入了创新的 Thinking Levels 机制，允许开发者调节推理深度。', 'Gemini 3.1 Pro is Google\'s latest complex problem solver, with native support for text, image, audio, video, and code multimodal reasoning. With an industry-leading 2M context window, and <strong>Gemini 3.1 Flash-Lite</strong> featuring innovative Thinking Levels to adjust reasoning depth.');

  content = content.replace(/上下文窗口/g, 'Context Window');
  content = content.replace(/多模态支持/g, 'Multimodality');
  content = content.replace(/核心优势/g, 'Key Strengths');
  content = content.replace(/API 定价/g, 'API Pricing');
  content = content.replace(/适用场景/g, 'Use Cases');

  content = content.replace(/文本 \/ 图像 \/ 音频/g, 'Text / Image / Audio');
  content = content.replace(/文本 \/ 图像 \/ 视觉推理/g, 'Text / Image / Visual');
  content = content.replace(/文本 \/ 图像 \/ 音频 \/ 视频 \/ 代码（全模态）/g, 'Text / Image / Audio / Video / Code (Native)');

  content = content.replace('复杂推理 · 代码生成 · 规划任务 · 专业工作流', 'Complex reasoning · Coding · Planning tasks · Professional workflow');
  content = content.replace('Agentic 工作流 · 大规模代码库 · 长文档分析 · 安全敏感场景', 'Agent workflows · Large codebases · Long doc analysis · Security-sensitive');
  content = content.replace('超长文档处理 · 视频分析 · 多模态对话 · 企业搜索增强', 'Ultra-long docs processing · Video analysis · Multimodal chat · Enterprise search');

  content = content.replace('快速对比', 'Quick Compare');
  content = content.replace(/特性/g, 'Feature');
  content = content.replace(/发布日期/g, 'Release Date');
  content = content.replace(/上下文/g, 'Context');
  content = content.replace(/原生多模态/g, 'Native Multimodal');
  content = content.replace(/代码能力/g, 'Coding');
  content = content.replace(/推理深度/g, 'Reasoning Depth');
  content = content.replace(/Agent 能力/g, 'Agentic Logic');
  content = content.replace(/速度/g, 'Speed');
  content = content.replace(/性价比/g, 'Cost-Effectiveness');

  content = content.replace('场景推荐', 'Recommendations');
  content = content.replace('根据你的具体需求选择最合适的模型', 'Pick the right model according to your specific needs');
  content = content.replace('首选', 'Top Pick');

  content = content.replace('代码开发', 'Coding & Dev');
  content = content.replace('需要代码生成、重构、调试或开发辅助', 'Require code generation, refactoring, debugging, or dev assistance');
  content = content.replace('GPT-5.4 集成 Codex 编程引擎，Claude 在代码精度上顶尖', 'GPT-5.4 integrates Codex engine, whilst Claude offers top coding accuracy');

  content = content.replace('Agent 工作流', 'Agent Workflows');
  content = content.replace('构建自主决策、多步执行的智能代理系统', 'Build autonomous, multi-step intelligent agent systems');
  content = content.replace('业界最强的 Agentic 能力和 Computer Use', 'Industry-leading Agentic capabilities and Computer Use');

  content = content.replace('长文档分析', 'Long Document Analysis');
  content = content.replace('需要处理超长文本、完整代码库或大量数据', 'Need to process ultra-long texts, full codebases, or massive data');
  content = content.replace('2M 上下文窗口，业界最长', '2M context window, industry\'s longest');

  content = content.replace('多模态任务', 'Multimodal Tasks');
  content = content.replace('需要图像理解、视频分析或音频处理', 'Need image understanding, video analysis, or audio processing');
  content = content.replace('原生支持文本/图像/音频/视频/代码五模态', 'Native support for text/image/audio/video/code');

  content = content.replace('复杂推理', 'Complex Reasoning');
  content = content.replace('数学证明、逻辑分析、复杂规划任务', 'Math proofs, logic analysis, complex planning tasks');
  content = content.replace('Thinking 模式展示完整推理链，准确率 94.7%', 'Thinking mode reveals complete reasoning steps, 94.7% accuracy');

  content = content.replace('成本敏感', 'Cost-Sensitive');
  content = content.replace('高调用量、预算有限的生产环境', 'High-volume API usage, budget-limited production environments');
  content = content.replace('最优性价比 + Thinking Levels 灵活控制', 'Best cost-effectiveness + Thinking Levels for flexible control');

  content = content.replace('2026 模型发布时间线', '2026 Model Release Timeline');
  content = content.replace('Anthropic 最强大的推理模型，专攻复杂 Agent 任务', 'Anthropic\'s most powerful model, tackling complex Agent tasks');
  content = content.replace('速度与智能的平衡，1M 上下文窗口 Beta', 'Balance of speed and logic, 1M context window Beta');
  content = content.replace('2M 上下文，全模态原生支持', '2M context, native full multimodal support');
  content = content.replace('Gemini 3.1 系列AI 图像生成器更新', 'Gemini 3.1 image generator update');
  content = content.replace('最具性价比的推理模型，Thinking Levels 机制', 'Most affordable reasoning model with Thinking Levels');
  content = content.replace('三变体发布：标准/Thinking/Pro，Computer Use', '3 variants launched: Standard/Thinking/Pro with Computer Use');

  content = content.replace('相关文章', 'Related Articles');
  content = content.replace('深度解析', 'Deep Dive');
  content = content.replace('GPT-5.4 vs Claude Opus 4.6 vs Gemini 3.1 Pro：终极横评', 'GPT-5.4 vs Claude Opus 4.6 vs Gemini 3.1 Pro: Ultimate Review');
  content = content.replace('四大维度全面评测三大顶级模型的真实表现。', 'A full 4-dimensional benchmark of the top three models.');
  content = content.replace(/阅读全文 /g, 'Read More ');
  
  content = content.replace('行业观察', 'Industry Vibes');
  content = content.replace('2026 年 AI 大模型发展趋势', '2026 AI Foundation Model Trends');
  content = content.replace('从推理飞跃到 Agent 成熟的全景分析。', 'A landscape analysis from reasoning hype to Agent maturity.');

  content = content.replace('多模态', 'Multimodal');
  content = content.replace('多模态大模型入门指南', 'Beginner\'s Guide to Multimodal LLMs');
  content = content.replace('探索多模态模型的图文理解与应用案例。', 'Exploring text-image understanding and use cases.');

  // Update article links
  content = content.replace(/\/articles\//g, '/en/articles/');

  fs.writeFileSync(path.join(modelsEnDir, 'index.html'), content, 'utf-8');
  console.log('Created en/models/index.html');
}

translateIndex();
translateAbout();
translateModels();
