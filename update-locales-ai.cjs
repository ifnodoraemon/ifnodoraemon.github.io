const fs = require('fs');

const zhPath = 'src/locales/zh.json';
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

zh.home.latestTag = "MEMORY SLICES / 记忆切片";
zh.home.latestTitle = "记忆切片";
zh.home.modelsTag = "COMPUTE CORES / 算力核心";
zh.home.modelsTitle = "算力核心序列";
zh.home.topicsTag = "KNOWLEDGE VECTORS / 知识向量";
zh.home.topicsTitle = "知识向量矩阵";
zh.home.aboutTag = "// SYSTEM_PROMPT.XML";
zh.home.aboutTitle = "&lt;system_prompt&gt;";
zh.home.aboutDesc = "&lt;identity&gt;<br>专注大语言模型底层逻辑拆解与复杂 Agent 工作流的落地实践。<br>&lt;/identity&gt;<br>&lt;directive&gt;<br>持续记录硅基生命的演进轨迹，将前沿AI技术沉淀为人类可读的知识库。<br>&lt;/directive&gt;";
zh.home.newsletterTitle = "建立神经链连接 (Neural Link)";
zh.home.newsletterDesc = "订阅我的算力更新、开源 Agent 架构与最新 AI 研究成果。请通过 GitHub 协议同步我的记忆节点。";
zh.home.newsletterBtn = "Establish Connection";

fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));

const enPath = 'src/locales/en.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

en.home.latestTag = "MEMORY SLICES / LATEST";
en.home.latestTitle = "Memory Slices";
en.home.modelsTag = "COMPUTE CORES / MODELS";
en.home.modelsTitle = "Compute Cores";
en.home.topicsTag = "KNOWLEDGE VECTORS / TOPICS";
en.home.topicsTitle = "Knowledge Vectors";
en.home.aboutTag = "// SYSTEM_PROMPT.XML";
en.home.aboutTitle = "&lt;system_prompt&gt;";
en.home.aboutDesc = "&lt;identity&gt;<br>Focused on dismantling the underlying logic of LLMs and implementing complex Agent workflows.<br>&lt;/identity&gt;<br>&lt;directive&gt;<br>Continuously track the evolution of silicon-based intelligence and document frontier AI tech.<br>&lt;/directive&gt;";
en.home.newsletterTitle = "Establish Neural Link";
en.home.newsletterDesc = "Subscribe to my compute updates, open-source Agent architectures, and latest AI research. Sync my memory nodes via GitHub.";
en.home.newsletterBtn = "Establish Connection";

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
