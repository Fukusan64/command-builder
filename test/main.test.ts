import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createShell, w } from '../src/main.ts';

const capture = () => createShell((cmd) => Promise.resolve(cmd));

describe('createShell（コマンド文字列の組み立て）', () => {
  it('単一コマンド', async () => {
    const $ = capture();
    assert.equal(await $.ls(), 'ls');
  });

  it('引数を関数呼び出しで追加', async () => {
    const $ = capture();
    assert.equal(
      await $.grep('pattern', 'file.txt')(),
      "grep 'pattern' 'file.txt'",
    );
  });

  it('配列で引数を渡す', async () => {
    const $ = capture();
    assert.equal(
      await $.git(['diff', '--name-only'])(),
      "git 'diff' '--name-only'",
    );
  });

  it('パイプ（プロパティチェーン）', async () => {
    const $ = capture();
    assert.equal(await $.ls.sort(), 'ls | sort');
  });

  it('パイプと引数', async () => {
    const $ = capture();
    assert.equal(await $.ps.grep('node')(), "ps | grep 'node'");
  });

  it('複数段パイプ', async () => {
    const $ = capture();
    assert.equal(await $.a.b.c(), 'a | b | c');
  });

  it('リダイレクト（>）', async () => {
    const $ = capture();
    assert.equal(
      await $.echo('hello')['>']['output.txt'](),
      "echo 'hello' > output.txt",
    );
  });

  it('リダイレクト（<）', async () => {
    const $ = capture();
    assert.equal(await $.cat['<']['input.txt'](), 'cat < input.txt');
  });

  it('引数内のシングルクォートはエスケープされる', async () => {
    const $ = capture();
    assert.equal(await $.echo("it's")(), "echo 'it\\'s'");
  });
});

describe('w ヘルパー', () => {
  it('タグ付きテンプレート', () => {
    assert.deepEqual(w`run build`, ['run', 'build']);
  });

  it('通常の文字列', () => {
    assert.deepEqual(w('run build'), ['run', 'build']);
  });

  it('変数埋め込み', () => {
    const target = 'production';
    assert.deepEqual(w`deploy ${target}`, ['deploy', 'production']);
  });

  it('createShell との組み合わせ', async () => {
    const $ = capture();
    assert.equal(await $.npm(w`run build`)(), "npm 'run' 'build'");
  });

  it('split の実装（連続スペース）', () => {
    assert.deepEqual(w('a  b'), ['a', 'b']);
  });
});

describe('エッジケース', () => {
  it('Symbol キーは拒否される', () => {
    const $ = capture();
    assert.throws(() => Reflect.get($, Symbol('x')), /Symbol is not allowed/);
  });
});
