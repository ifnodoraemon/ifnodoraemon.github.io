# Mermaid 架构图发布前验证规范

在编写、修改或重构任何 Markdown 技术文章后，并在执行 Git 提交与发布前：
1. **强制执行 Mermaid 语法校验**：必须主动执行 `node scripts/verify-mermaid.js`（或 `npm run test:smoke`），确保全站所有中英文技术文章中的 Mermaid 代码块 100% 能够被 AST 语法解析器正确解析。
2. **禁止裸写特殊字符**：在 `subgraph` 或节点标签中包含冒号（`:`）、括号（`(`、`)`）、反斜杠、斜杠等特殊字符时，必须使用双引号包裹，如 `subgraph SubId["Title (Special)"]` 或 `NodeId["Label (Detail)"]`，严禁产生裸括号或裸冒号导致浏览器端渲染崩溃。
3. **零报错原则**：凡是存在任一处 Mermaid 语法报错或解析警告，严禁执行发布推送，必须修复完毕并通过校验。
