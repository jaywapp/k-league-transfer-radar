# 작업지시서: 배송 조회 화면 구현

| 항목 | 내용 |
| --- | --- |
| 대상 | K League Transfer Radar 공개 조회 화면(구단별 이적 현황 + 이적 건 상세) |
| 채택 디자인 | 시안 5 "배송 조회" ([프로토타입](../ux-concepts/transfer-board/concept-02/), 2026-10-15 사용자 선호) |
| 근거 문서 | UX UI 요청서 `docs/ux-ui-request.md`, 서버 연동 규격 `docs/server-contract.md`, 공개 API `contracts/public-api.openapi.json` |
| 설계 리소스 | [토큰 CSS](tokens.css) · [토큰 JSON](tokens.json) · [컴포넌트 명세](components.md) · [문구표](copy.md) · [스크린샷](assets/) |
| 데이터 | `packages/radar-client`(조회 클라이언트), 개발 중에는 `data/fixtures/radar.json` 또는 시안의 합성 데이터 |

이 문서만 읽고 구현을 시작할 수 있도록 썼습니다. 디자인 판단이 필요한 부분은 [컴포넌트 명세](components.md)에 값으로 정해 두었고, 정해지지 않은 것은 맨 아래 "결정이 필요한 것"에 모았습니다.

## 1. 만들 것

한 화면 + 상세 패널입니다.

1. **구단별 현황**: 시장·구단 선택, 보기 필터(전체·진행 중·확정·결렬·반박), 영입·방출 섹션, 이적 건마다 조회 막대 한 줄.
2. **이적 건 상세**: 현재 위치, 큰 조회 막대, 조회 이력(단계 반영·주장·검토 중 주장·공식 확인을 시각순으로), 원문 링크.
3. **상태 화면**: 로딩, 결과 없음, 오류(종류별), 재조회 실패, 다음 페이지 실패, 갱신 지연, 지난 시장.

관리자 예외 검토 화면, 로그인, 개인화, 알림은 이번 범위가 아닙니다.

## 2. 반드시 지킬 규칙 (위반하면 반려)

1. 초록(`--st-confirmed-bg`)과 체크·인장 아이콘은 `official_confirmation`이 있는 건에만 쓴다.
2. 공식 확정 외 단계는 "~설"로 쓰고 열린 모양(점선, 빈 원)으로 그린다.
3. 검토 대기 중인 상충 주장은 막대를 움직이지 않는다. 주황 점선 "유령 표시"와 "~ 주장 검토 중" 꼬리표로만 보여 준다.
4. 신뢰도를 %나 확률로 쓰지 않는다.
5. 낮은 신뢰도·검토 대기 건을 기본 목록에서 숨기지 않는다.
6. 오류를 빈 목록으로 보여 주지 않는다. 결과 없음과 조회 실패의 화면이 달라야 한다.
7. 재게시를 독립 근거처럼 세지 않는다. "출처 n (독립 m)"으로 표시하고 이력에서는 접는다.
8. 화면에 직접 DB 접속 정보나 API 키를 두지 않는다. 조회는 공개 API만 쓴다.

## 3. 데이터 연결

| 화면 요소 | 필드 | 비고 |
| --- | --- | --- |
| 시장 선택 | `GET /v1/transfer-windows` → `label`, `archived_at` | `archived_at`이 있으면 지난 시장(읽기 전용) |
| 구단 선택 | `GET /v1/clubs?window_id=` → `name`, `short_name`, `league` | K리그1/2로 묶는다 |
| 목록 | `GET /v1/transfer-cases?window_id=&club_id=` | 방향 필터 없이 받아 화면에서 영입·방출로 나눈다(`to_club.id = 선택 구단` → 영입) |
| 막대 위치 | `stage` | 역 위치: interest 0%, contact 25%, negotiation 50%, near_agreement 75%, confirmed 100%. unknown·failed 규칙은 명세 3장 |
| 막대 굵기 | `confidence` | 3/5/7px |
| 아바타 | `player.name`, `player.id`, `stage`, `review_status` | `player.id = null`이면 "?" |
| 상대 구단 | `from_club` / `to_club` | `null`이면 "출발 미상" / "행선지 미상" |
| 유령 표시, 꼬리표 | **추가 필드 필요**: 목록 항목의 `pending_claims[] { claimed_stage, analyzed_at }` | 계약 1.0에 없음. 서버와 합의 전에는 표시하지 않고 `review_status = pending`만 보여 준다 |
| 상세 | `GET /v1/transfer-cases/{id}` → `history[]`, `evidence[]`, `official_confirmation` | 이력 조합 규칙은 명세 8장 |
| 출처 수 | `source_count`, `independent_source_count` | |
| 갱신 상태 | 응답 `meta.pipeline_status`, `meta.last_successful_sync_at` | `generated_at`을 갱신 시각으로 쓰지 않는다 |
| 페이지 | `next_cursor`, `limit=30` | 필터·구단·시장이 바뀌면 커서를 버린다 |

**주소 상태**: 시장(`w`), 구단(`club`), 보기 필터(`view`), 열린 상세(`case`)를 쿼리에 둔다. 뒤로 가기로 상세를 닫으면 같은 목록·스크롤 위치·포커스로 돌아온다.

**늦게 도착한 응답**: 요청마다 순번을 붙이고, 화면에 반영하기 직전에 최신 요청이 아니면 버린다. `packages/radar-client`의 취소(AbortSignal)를 함께 쓴다.

## 4. 작업 순서와 완료 기준

각 단계는 독립된 PR로 올립니다. 단계마다 라이트·다크 × 1440·768·390·320 폭 스크린샷을 PR에 붙입니다.

| 단계 | 작업 | 완료 기준 |
| --- | --- | --- |
| 0. 준비 | UI 스택 확정(아래 결정 1), `tokens.css`를 전역 스타일로 가져오기, Pretendard·아이콘(Phosphor regular) 설치 | 빈 페이지에서 라이트·다크 토큰이 바뀜 |
| 1. 막대 | `TrackBar` 단독 구현(스토리북 또는 예시 페이지). 7개 단계 × 신뢰도 3 × 유령 유무 조합 | 명세 3장의 크기·위치와 일치. `assets/list-desktop-light.png`와 나란히 비교해 같음 |
| 2. 목록 | `ParcelRow`, `PlayerAvatar`, 섹션, 묶음 소제목, 보기 필터, 데이터 연결, 30건 더 보기 | 합성 데이터로 영입 8·방출 6이 시안과 같은 순서로 나옴. 320px 가로 스크롤 없음 |
| 3. 상세 | `TrackingDetail`, `TrackingHistory`, 재게시 접기, 원문 링크, 식별 안내, 데스크톱 비켜나기·모바일 시트 | 장하람(재게시 접힘), 고은찬(공식 확정 + 검토 중 결렬 주장), 윤서우(원문 삭제) 건이 `assets/detail-*.png`와 같은 의미로 보임 |
| 4. 상태 | 명세 9장 전 상태, 주소 상태 복원, 늦은 응답 버리기 | 상태별로 결과 없음과 실패가 구별됨. 빠르게 구단을 바꿔도 이전 구단 결과가 덮어쓰지 않음 |
| 5. 접근성·마감 | 키보드 흐름, 접근 가능한 이름, 대비, 모션 줄이기, "글 목록" 대안 | 아래 점검표 통과 |

## 5. 점검표 (PR마다)

- [ ] 초록이 공식 확정 건에만 나온다(검토 완료 건에 초록 없음).
- [ ] 협상설·검토 대기 건을 처음 보는 사람이 "확정"으로 읽지 않는다(문구 "~설", 점선, 꼬리표 확인).
- [ ] 검토 중 결렬 주장이 있어도 막대는 협상에 머문다.
- [ ] 결과 없음, 필터 결과 없음, 오류 3종(503·429·통신)이 서로 다른 화면이다.
- [ ] 재조회 실패 시 이전 목록과 시각이 남는다.
- [ ] 320px에서 가로 스크롤 없음, 긴 이름("Alexander Christopher Wellington-Barnes")이 말줄임된다.
- [ ] 키보드만으로 시장 → 구단 → 행 → 상세 → 원문 → 닫기 → 같은 행 포커스가 된다.
- [ ] 라이트·다크 모두 본문 대비 4.5:1 이상.
- [ ] `prefers-reduced-motion`에서 유령 표시가 깜빡이지 않는다.
- [ ] 콘솔 오류 0.

## 6. 참고 리소스

| 파일 | 용도 |
| --- | --- |
| `assets/list-desktop-light.png`, `list-desktop-dark.png` | 목록 데스크톱 기준 화면 |
| `assets/list-mobile-light.png`, `list-mobile-dark.png` | 목록 모바일(두 줄 행) |
| `assets/detail-desktop-pending.png` | 문태오: 협상설 + 결렬 주장 검토 중, 목록이 비켜난 모습 |
| `assets/detail-desktop-official-conflict.png` | 고은찬: 공식 확정 뒤 결렬 주장 검토 중 |
| `assets/detail-mobile-reposts.png` | 장하람: 재게시 접기, 모바일 시트 |
| `assets/state-error.png`, `state-empty.png`, `state-delayed.png`, `state-archive.png`, `state-stress.png` | 상태 화면 |
| `../ux-concepts/transfer-board/concept-02/` | 동작하는 프로토타입(검토 도구로 상태 전환 가능) |
| `../ux-concepts/transfer-radar/shared/` | 합성 데이터(`data.js`), 문구·날짜 함수(`model.js`), 상태 화면 문구(`parts.js`) |

프로토타입 실행: 저장소 루트에서 `python -m http.server 8731 --bind 127.0.0.1` 후 `http://127.0.0.1:8731/docs/ux-concepts/transfer-board/concept-02/index.html`. `file://`로 직접 열어도 됩니다.

프로토타입과 이 문서의 차이: 프로토타입에는 "30건 더 보기"와 서버 필터 UI가 없습니다. 이 문서 기준으로 구현합니다.

## 7. 결정이 필요한 것

1. **UI 스택**: 미정. 정해지기 전에는 작업 1(막대)까지만 프레임워크 독립 컴포넌트로 진행할 수 있다.
2. **`pending_claims` 추가 필드**: 서버와 합의 필요. 합의 전에는 유령 표시·꼬리표를 끈다.
3. **한국어 표시명**: "K리그 이적 레이더"는 임시. 브랜딩 결정에 따른다.
4. **구단 엠블럼**: 사용 조건 확인 전에는 쓰지 않는다(구단명 글자만).
5. **역 순서 표현의 오해 여부**: 단계는 자동 승격 순서가 아니라는 계약 원칙이 있다. 처음 방문자 5명 정도로 "막대가 끝까지 가면 확정된 것"으로만 읽히는지 짧게 확인할 것.
