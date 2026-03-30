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

// AbortSignal（最終呼び出しに渡すと中断可能）
const controller = new AbortController();
const promise = $.sleep('30')(controller.signal);
controller.abort(); // 子プロセスを停止できるようにする
await promise; // AbortError になる

// AbortSignal を直接渡して実行
await $.ls(controller.signal);
```

## API

### `createShell(shell?)`

コマンドビルダーを作成します。

```typescript
// デフォルト (sh)
const $ = createShell();

// シェルを指定
const $ = createShell('bash');

// カスタム実行関数を渡す（第2引数に AbortSignal が渡る場合がある）
const $ = createShell(async (command, signal) => {
  // 任意の処理（signal を子処理へ転送してもよい）
  return stdout;
});
```

デフォルトの `createShell()` / `createShell('sh' | 'bash' | …)` は、Node.js の [`child_process.exec`](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback) に `signal` を渡します。最終呼び出しで `AbortSignal` を1つだけ渡すと、その `signal` が使われます。

### コマンドの組み立て

| 操作 | 構文 | 生成されるコマンド |
|------|------|--------------------|
| 実行 | `$.ls()` | `ls` |
| 中断付き実行 | `$.ls(signal)` | `ls`（`signal` は executor に渡る） |
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
