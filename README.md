# command-builder

Proxy を活用したシェルコマンドビルダー。
プロパティアクセスによるパイプ接続と関数呼び出しによる引数追加を組み合わせた API を提供する。

## 使い方

```typescript
import { createShell, w } from 'command-builder';

const $ = createShell();

// コマンドの実行（引数なしで呼ぶと実行）
await $.ls();

// 引数の追加
await $.grep('pattern', 'file.txt')();

// パイプ（プロパティアクセスで自動接続）
await $.ls.sort();            // ls | sort
await $.ps.grep('node')();   // ps | grep "node"

// サブコマンド（関数呼び出しで引数として追加）
await $.git('diff', '--name-only')();   // git "diff" "--name-only"

// w ヘルパーで複数引数を簡潔に渡す
await $.npm(w`run build`)();   // npm "run" "build"

// リダイレクト
await $.echo('hello')['>']['output.txt']();   // echo "hello" > output.txt
```

## API

### `createShell(shell?)`

コマンドビルダーを作成します。

```typescript
// デフォルト (sh)
const $ = createShell();

// シェルを指定
const $ = createShell('bash');

// カスタム実行関数を渡す
const $ = createShell(async (command) => {
  // 任意の処理
  return stdout;
});
```

### コマンドの組み立て

| 操作 | 構文 | 生成されるコマンド |
|------|------|--------------------|
| 実行 | `$.ls()` | `ls` |
| 引数追加 | `$.grep('pattern')()` | `grep "pattern"` |
| 複数引数 | `$.git('diff', '--name-only')()` | `git "diff" "--name-only"` |
| 配列で引数 | `$.git(['diff', '--name-only'])()` | `git "diff" "--name-only"` |
| パイプ | `$.ls.sort()` | `ls \| sort` |
| リダイレクト | `$.echo('hello')['>']['out.txt']()` | `echo "hello" > out.txt` |

### `w` ヘルパー

スペース区切りの文字列を引数の配列に変換。
タグ付きテンプレートリテラルとしても、通常の関数としても使える。

```typescript
w`run build`        // ['run', 'build']
w('run build')      // ['run', 'build']

// 変数の埋め込みも可能
const target = 'production';
w`deploy ${target}` // ['deploy', 'production']
```

## ライセンス

[0BSD](./LICENSE)
