# vscode-find-tests

Let's you swap between source and test files easily. Currenly only supports
javascript and related naming conventions.

## Features

Run the Peek or Open to the side commands to see the corresponding test or
source file.

## Example keybinding

```json
[
    {
        "key": "cmd+t",
        "command": "findTests.peekTestFileToTheSide"
    },
    {
        "key": "cmd+shift+t",
        "command": "findTests.peekTestFile"
    }
]
```
