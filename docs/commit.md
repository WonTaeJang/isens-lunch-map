# Git Commit Policy

## 1. Commit 주기 (Frequency)

### 기본 원칙

- **작고 자주 커밋하라** (Commit early, commit often)
- 한 커밋은 **하나의 논리적 변경** (logical change)만 포함해야 합니다.

### 권장 주기

| 상황      | 커밋 타이밍                 | 예시                                     |
| --------- | --------------------------- | ---------------------------------------- |
| 기능 개발 | 부분 기능 완성 시점         | `[feat] : Add refresh token`             |
| 버그 수정 | 원인 파악 후 수정 완료 시   | `[fix] : Handle null response`           |
| 문서 수정 | 내용 보완 시                | `[docs] : Update API usage section`      |
| 리팩터링  | 기능 변화 없이 구조 개선 시 | `[refactor] : Simplify validation logic` |

---

## 2. Commit 단위 및 크기 (Size)

| 항목      | 권장 기준                    | 비고                             |
| --------- | ---------------------------- | -------------------------------- |
| 커밋 목적 | 1개만 포함                   | 예: `[feat]` + `[fix]` 혼합 금지 |
| 커밋 요약 | 한 문장으로 설명 가능해야 함 | 메시지가 길면 커밋 분할 필요     |

---

## 3. Commit 메시지 규칙 (Message Convention)

### 기본 구조

```
[type] : <subject>

<body>

<footer>
```

---

### type (커밋 유형)

| Type           | 설명                                 | 예시                                   |
| -------------- | ------------------------------------ | -------------------------------------- |
| **[feat]**     | 새로운 기능 추가                     | `[feat] : Add OAuth2 login`            |
| **[fix]**      | 버그 수정                            | `[fix] : Handle timeout properly`      |
| **[docs]**     | 문서 수정                            | `[docs] : Update installation guide`   |
| **[style]**    | 포맷 변경, 세미콜론 등 비기능적 수정 | `[style] : Format code`                |
| **[refactor]** | 코드 리팩터링                        | `[refactor] : Simplify error handler`  |
| **[perf]**     | 성능 개선                            | `[perf] : Improve query speed`         |
| **[test]**     | 테스트 추가/수정                     | `[test] : Add signup test`             |
| **[chore]**    | 빌드, 의존성, 설정 등                | `[chore] : Bump axios to 1.7.0`        |
| **[ci]**       | CI/CD 설정 변경                      | `[ci] : Add workflow for tests`        |
| **[revert]**   | 이전 커밋 되돌리기                   | `[revert] : Revert login feature`      |
| **[deploy]**   | 배포                                 | `[deploy] : Deploy to production`      |
| **[build]**    | 빌드                                 | `[build] : Update build configuration` |
| **[content]**  | 글 업데이트                          | `[content] : Update user guide`        |

---

### 기본 원칙

- **영어로 작성**: 모든 커밋 메시지는 영어로 작성합니다.
- **개인정보 제외**: 이름, 이메일 주소 등 개인 식별 정보를 포함하지 않습니다.
- **고유 식별자 제외**: diff에 명시적으로 포함되지 않은 버그 ID나 고유 식별자는 포함하지 않습니다.
- .env 변경사항 무시
- only staged changes
- **Co-Authored-By 금지**: 커밋 메시지에 `Co-Authored-By` 트레일러를 절대 추가하지 않는다

---

### subject (제목)

- 최대 **50자 이내**
- **명령형** 사용 (e.g., "add" not "added", 한국어 예: "리포트 차트 색상 변경")
- **끝에 마침표 금지**
- **구체적인 변경사항에 집중**하여 작성
- **식별자 번역 금지**: 파일명, 클래스명, 함수명 등 식별자는 원문 그대로 사용 (다른 언어로 번역하지 않음)

---

### body (본문)

- 선택사항 (필요 시 상세 설명)
- **무엇을, 왜 변경했는지** 중심으로 작성
- 줄바꿈은 **72자 이하**

---

### footer (하단)

- 하위 호환성 깨짐:
  ```
  BREAKING CHANGE: removed deprecated /v1/login endpoint
  ```
- 이슈 연결:
  ```
  [Issue]: [Issue-NO]
  ```

---
