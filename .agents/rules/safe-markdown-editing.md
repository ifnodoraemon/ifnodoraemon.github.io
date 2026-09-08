---
name: safe-markdown-editing
description: Prohibits the use of native sed for multiline markdown editing to prevent formatting corruption.
trigger: always_on
---

# Markdown 安全编辑守则

在需要对现有的 Markdown 文件进行跨行修改、大规模内容替换或代码块修改时：
1. **禁用原生 sed**：绝对禁止使用 Shell 的 `sed` 命令进行复杂的多行匹配和替换，极易导致代码缩进丢失或反引号错乱。
2. **使用 Python 脚本**：必须编写稳定的 Python 脚本，通过完整的字符串读写 (`content.replace()`) 或正则表达式 (`re.sub()`) 来进行精确替换，确保原始文件的排版格式毫发无损。
