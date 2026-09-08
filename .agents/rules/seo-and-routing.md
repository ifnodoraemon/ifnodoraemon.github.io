---
name: seo-and-routing
description: Enforces SEO best practices (FAQs) and correct bilingual routing paths for articles.
trigger: always_on
---

# 博客双语路由与 SEO 规范

在创建或大量重构 Markdown 技术文章时，必须严格遵守以下规范：
1. **强制 FAQ 模块**：文章末尾必须包含 `## 常见问题 (FAQ)` 模块，并至少提供 2-3 个与文章内容紧密相关的硬核技术问答，以提升 SEO 覆盖率。
2. **绝对路径内链**：在文章中插入内部链接时，禁止使用相对路径。
   - 中文文章必须使用 `/articles/<slug>/` 格式。
   - 英文文章必须使用 `/en/articles/<slug>/` 格式。
