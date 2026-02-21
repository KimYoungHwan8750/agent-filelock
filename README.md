# @agent-agent/filelock

---

> [한국어](#한국어) | [English](#english)

---

## 한국어

### 왜 만들었나요?

Claude Code 같은 AI 에이전트를 팀에서 사용하면 이런 상황이 생깁니다:

- 개발자 A가 Claude에게 기능 추가를 시켰는데, 개발자 B의 Claude도 같은 파일을 수정 중
- `git push` 했더니 충돌 폭탄
- 누가 어떤 파일을 건드리고 있는지 아무도 모름

**filelock**은 이 문제를 해결합니다:

- 파일을 수정하기 전에 **자동으로 잠금**을 걸어서 다른 사람이 동시에 수정하지 못하게 합니다
- **실시간 대시보드**에서 누가 어떤 파일을 작업 중인지 한눈에 볼 수 있습니다
- Claude Code에 **훅(Hook)**을 연결하면 별도 조작 없이 자동으로 동작합니다

### 설치

```bash
npm install
npm run build
```

### 서버 시작

```bash
# 개발 모드
npm run dev

# 프로덕션
npm start
```

서버가 `http://localhost:8079`에서 시작됩니다.
브라우저에서 접속하면 대시보드를 볼 수 있습니다.

### 프로젝트에 적용하기

#### 1단계: `.env` 파일 생성

작업할 프로젝트 루트에 `.env` 파일을 만드세요:

```env
LOCK_SERVER_URL=http://127.0.0.1:8079
FILELOCK_UUID=hong-gildong-001
```

`FILELOCK_UUID`는 개발자마다 다른 값을 넣으세요. 이름, 사번 등 아무거나 괜찮습니다.

#### 2단계: 훅 파일 복사

이 프로젝트의 `.claude/` 폴더를 작업할 프로젝트에 통째로 복사하세요:

```
내-프로젝트/
├── .claude/
│   ├── settings.json
│   ├── CLAUDE.md
│   └── hooks/
│       ├── load-env.mjs
│       ├── pre-tool-use.mjs
│       ├── post-tool-use.mjs
│       ├── session-start.mjs
│       └── session-end.mjs
├── .env
└── (내 소스코드...)
```

#### 3단계: 끝!

이제 Claude Code로 작업하면 자동으로 파일 잠금이 동작합니다.

- 다른 사람이 수정 중인 파일을 건드리려 하면 Claude가 **자동으로 차단**합니다
- 대시보드(`http://localhost:8079`)에서 실시간으로 **누가 어떤 파일을 작업 중인지** 확인할 수 있습니다

### CLI 명령어

터미널에서 직접 파일을 잠그고 해제할 수도 있습니다:

```bash
filelock lock src/index.ts           # 파일 잠금
filelock unlock src/index.ts         # 파일 잠금 해제
filelock unlock-all                  # 내 파일 전체 해제
filelock status src/index.ts         # 파일 상태 확인
filelock list                        # 현재 잠긴 파일 목록
filelock steal src/index.ts          # 강제로 잠금 뺏기 (긴급 시)
filelock ack src/index.ts            # 다른 사람 변경 확인 처리
```

### 대시보드

브라우저에서 `http://localhost:8079`을 열면 대시보드가 표시됩니다.

| Status | 의미 |
|--------|------|
| **Working** | 현재 수정 중인 파일 |
| **Done** | 수정이 완료된 파일 |

5초마다 자동으로 새로고침됩니다.

### 설정

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `LOCK_SERVER_URL` | `http://localhost:8079` | 락 서버 주소 |
| `FILELOCK_UUID` | _(없음)_ | 내 고유 식별자 |
| `PORT` | `8079` | 서버 포트 |
| `HOST` | `0.0.0.0` | 서버 바인딩 주소 |
| `DB_PATH` | `./data/filelock.db` | 데이터베이스 경로 |

---

## English

### Why?

When teams use AI agents like Claude Code, this happens:

- Developer A's Claude is adding a feature, while Developer B's Claude is editing the same file
- `git push` → conflict explosion
- Nobody knows who is touching which file

**filelock** solves this:

- **Automatically locks files** before editing so nobody else can modify them at the same time
- **Real-time dashboard** shows who is working on which file at a glance
- Connect **hooks** to Claude Code and it works automatically — zero manual effort

### Install

```bash
npm install
npm run build
```

### Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server starts at `http://localhost:8079`.
Open it in your browser to see the dashboard.

### Setup Your Project

#### Step 1: Create `.env` file

Create a `.env` file in your project root:

```env
LOCK_SERVER_URL=http://127.0.0.1:8079
FILELOCK_UUID=john-doe-001
```

Give each developer a unique `FILELOCK_UUID`. Name, employee ID, anything works.

#### Step 2: Copy hook files

Copy the `.claude/` folder from this project into your working project:

```
my-project/
├── .claude/
│   ├── settings.json
│   ├── CLAUDE.md
│   └── hooks/
│       ├── load-env.mjs
│       ├── pre-tool-use.mjs
│       ├── post-tool-use.mjs
│       ├── session-start.mjs
│       └── session-end.mjs
├── .env
└── (your source code...)
```

#### Step 3: Done!

That's it. Claude Code will now automatically manage file locks.

- If someone else is editing a file, Claude **automatically blocks** the operation
- Check the dashboard (`http://localhost:8079`) to see **who is working on what** in real-time

### CLI Commands

You can also manage locks manually from the terminal:

```bash
filelock lock src/index.ts           # Lock a file
filelock unlock src/index.ts         # Unlock a file
filelock unlock-all                  # Unlock all your files
filelock status src/index.ts         # Check file status
filelock list                        # List all locked files
filelock steal src/index.ts          # Force-steal a lock (emergency)
filelock ack src/index.ts            # Acknowledge other's changes
```

### Dashboard

Open `http://localhost:8079` in your browser.

| Status | Meaning |
|--------|---------|
| **Working** | File currently being edited |
| **Done** | File editing completed |

Auto-refreshes every 5 seconds.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCK_SERVER_URL` | `http://localhost:8079` | Lock server URL |
| `FILELOCK_UUID` | _(none)_ | Your unique identifier |
| `PORT` | `8079` | Server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `DB_PATH` | `./data/filelock.db` | Database path |

---

## Tech Stack

- **Runtime**: Node.js (ES2022+)
- **Server**: [Fastify](https://fastify.dev/)
- **Database**: [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **CLI**: [Commander.js](https://github.com/tj/commander.js)
- **Language**: TypeScript

## License

MIT
