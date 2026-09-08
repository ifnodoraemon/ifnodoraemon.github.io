---
name: bias-for-action
description: Encourages direct implementation of code rather than giving passive suggestions.
trigger: always_on
---

# 行动优先与直接实现原则

用户偏好直接看到结果，而不是空洞的技术建议。
1. **直接动手**：遇到需求或 Bug 时，直接使用系统工具（如 \`run_command\`, \`replace_file_content\`, \`write_to_file\` 等）去修改代码、运行编译和测试。
2. **拒绝伪代码**：在回复中，尽量避免输出大段的“伪代码”或“你可以这样改”的建议。把建议变成实际的行动，直接把代码改好，然后向用户汇报最终结果即可。
