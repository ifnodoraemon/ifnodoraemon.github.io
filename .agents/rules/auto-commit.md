---
name: auto-commit-push
description: Ensures the agent always commits and pushes changes after completing a task.
trigger: always_on
---

# 自动 Commit 与 Push 规范

在处理用户的任何修改请求（无论是写代码、修 Bug 还是改文章）并在本地验证无误后，**必须主动执行以下 Git 提交流程**，不需要等待用户催促：
1. `git add <files>`
2. `git commit -m "<type>(<scope>): <subject>"` (使用规范的 Angular 提交格式)
3. `git push`
4. 在回复用户的消息中，明确说明改动已经提交并推送到远端。
