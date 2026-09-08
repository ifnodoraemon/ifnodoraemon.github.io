---
name: strict-fact-checking
description: Ensures absolute accuracy when writing technical articles, preventing hallucinations of framework versions or hardware specs.
trigger: always_on
---

# 严格的事实核查指南 (Strict Fact-Checking Guideline)

在编写、修改或审核技术文章时，必须严格遵守以下事实核查红线：

1. **严禁凭空推演**：绝对禁止自行推演或编造任何框架版本号、硬件参数、或性能指标。
2. **版本号绝对准确**：凡是涉及具体工具或框架的版本（如 vLLM, CUDA, PyTorch 等），必须确保版本号真实存在且符合当前设定的时间线。绝不允许随意跨越主版本号（例如想当然地编造 `2.0` 版本）。
3. **硬件与数学严谨**：所有关于显存占用、Token 费用计算、硬件拓扑的数学计算必须经过严谨的交叉验证，确保逻辑无误。
4. **遇事不决先询问**：如果在撰写时遇到不确定的特定技术细节，宁可向用户请求确认，也绝对不能为了文章通顺而进行“看似合理”的盲目猜测。
