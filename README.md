# auto-startup-local-console

`auto-startup` から DB 依存部分を外し、ローカルの成果物・Codex タスク・共有設定・複数人ログインだけに絞って再構成した OSS アプリです。

## 何を切り出したか

- DB は持ちません。状態は `backend/data/*.json` に保存します。
- 管理対象は `workspace roots` 配下の `drafts` / `grant-prep` / `quality_reports` / `reports` / `submissions` などの成果物です。
- 複数人ログインは cookie session + role (`admin` / `member`) で扱います。
- Codex 実行はローカル subprocess として `codex exec --full-auto --skip-git-repo-check` を呼びます。

## セットアップ

### backend

```bash
cp backend/.env.example backend/.env
make setup-backend
```

### frontend

```bash
cp frontend/.env.example frontend/.env.local
make setup-frontend
```

### 起動

```bash
make backend
make frontend
```

- backend: [http://127.0.0.1:8010](http://127.0.0.1:8010)
- frontend: [http://127.0.0.1:3010](http://127.0.0.1:3010)

初回起動時、admin 資格情報は `backend/data/bootstrap-admin.txt` に生成されます。

## 主要画面

- `/login`: 複数人ログイン
- `/`: workspace / artifact / task / user のダッシュボード
- `/artifacts`: 成果物ブラウザ
- `/tasks`: Codex タスク生成・監視・再試行・取消
- `/settings`: workspace roots / artifact dirs / default prompt を管理
- `/users`: admin 向け利用者管理

## テスト

```bash
make test-backend
make lint-frontend
make typecheck-frontend
```
