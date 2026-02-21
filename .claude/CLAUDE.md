이 프로젝트는 다음과 같은 목적으로 개발되었습니다.
1. agent를 병렬로 실행할 때 파일 충돌을 막기 위함.
2. 개발자 간에 협업을 할 때, AI 사용이 많아지면서 한 파일에 국한되지 않고 여러 파일을 동시에 건드리는 경우가 많습니다. 따라서 push 했을 때 충돌나는 상황을 막기 위해 실시간으로 변경이 일어난 파일을 중앙관제서버에서 확인할 수 있도록 설계되었습니다.

## 환경 변수
- 작업 시작 시 `.env` 파일을 읽어 `LOCK_SERVER_URL`과 `FILELOCK_UUID` 값을 확인하세요.
- `LOCK_SERVER_URL`: 락 서버 주소 (예: `http://127.0.0.1:8079`)
- `FILELOCK_UUID`: 현재 개발자 식별 UUID

## 작업 절차 (중요!)

작업을 시작하기 전에 반드시 아래 절차를 따르세요:

### 1단계: 작업 분석 및 파일 목록 작성
- 사용자의 요청을 분석하여 수정이 필요한 **모든 파일**을 미리 파악합니다.
- 코드를 읽고 탐색하여 정확한 파일 목록을 확정하세요.
- 파일 경로는 프로젝트 루트 기준 상대 경로로 작성합니다. (예: `src/server/services/lock-service.ts`)

### 2단계: 배치 락 획득
- 파악한 파일 목록에 대해 **작업 시작 전** 한 번에 락을 획득합니다.
- Bash 도구로 아래 curl 명령어를 실행하세요 (변수를 실제 값으로 치환):

```bash
curl -s -X POST "${LOCK_SERVER_URL}/api/v1/locks/acquire-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "filePaths": ["파일경로1", "파일경로2", "파일경로3"],
    "owner": "claude:${SESSION_ID}",
    "ownerName": "Claude Agent",
    "metadata": { "developerUuid": "${FILELOCK_UUID}" }
  }'
```

- 응답이 `{"ok": true}` 이면 모든 파일의 락을 성공적으로 획득한 것입니다.
- 응답이 `{"ok": false}` 이면 `conflicts` 배열을 확인하여 충돌 파일과 소유자 정보를 **사용자에게 보고**하고, 어떻게 할지 확인을 받으세요.
- **모든 락을 획득한 후에만** 파일 수정을 시작하세요.

### 3단계: 파일 수정 작업 수행
- 락을 획득한 파일들에 대해 Write/Edit 도구로 수정 작업을 진행합니다.
- Hook이 안전망으로 동작하므로 개별 파일 락은 걱정하지 않아도 됩니다.

### 4단계: 배치 락 해제
- **모든 수정 작업이 완료된 후** 한 번에 락을 해제합니다:

```bash
curl -s -X POST "${LOCK_SERVER_URL}/api/v1/locks/release-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "filePaths": ["파일경로1", "파일경로2", "파일경로3"],
    "owner": "claude:${SESSION_ID}"
  }'
```

### 추가 파일이 발견된 경우
- 작업 중 추가로 수정할 파일이 발견되면, 해당 파일들에 대해 배치 락 획득을 다시 실행하세요.
- Hook이 안전망으로 동작하여 락 없이 수정하려 할 경우에도 자동으로 개별 락 획득을 시도합니다.

## 동작 방식
1. 위 작업 절차에 따라 배치로 파일 락을 획득/해제함
2. Hook을 안전망으로 사용해 Write/Edit 사용 전에 락 상태를 확인함
3. 현재 작업 중인 파일일 경우 개발자에게 작업 중인 파일이므로 작업할 수 없다고 보고. 어떻게 해야할지 확인받아서 추가 작업 진행.
4. 파일이 작업 중은 아니지만 작업한 정황이 파악될 경우 파일 작업자 UUID(.env 파일 확인)가 본인이면 계속 진행, UUID가 다르면 다른 개발자가 작업한 것이므로 개발자에게 이를 인지시킨 후 작업을 진행시킬지, 중단할지 물어봄.

## API 엔드포인트

### 배치 락 획득 (원자적 - all or nothing)
- `POST /api/v1/locks/acquire-batch`
- Body: `{ "filePaths": string[], "owner": string, "ownerName": string, "ttlMinutes"?: number, "metadata"?: object }`
- 성공: `{ "ok": true, "locks": LockRecord[] }`
- 실패 (409): `{ "ok": false, "error": "PARTIAL_LOCK_FAILURE", "conflicts": [{ "filePath": string, "lock": LockRecord }] }`

### 배치 락 해제
- `POST /api/v1/locks/release-batch`
- Body: `{ "filePaths": string[], "owner": string }`
- 응답: `{ "ok": true, "releasedCount": number, "failed"?: string[] }`

### 기존 엔드포인트
- `POST /api/v1/locks/acquire` - 단일 파일 락 획득
- `POST /api/v1/locks/release` - 단일 파일 락 해제
- `POST /api/v1/locks/release-all` - owner의 모든 락 해제
- `POST /api/v1/locks/heartbeat` - TTL 갱신
- `GET /api/v1/locks` - 락 목록 조회
- `GET /api/v1/locks/status?filePath=` - 단일 파일 락 상태 조회
- `POST /api/v1/changes/record` - 변경사항 기록
- `GET /api/v1/changes/check?filePath=&developerUuid=` - 다른 개발자 변경사항 확인
- `POST /api/v1/changes/acknowledge` - 변경사항 확인 처리
