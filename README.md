# SAMJOO SM CO., LTD. / DORIKO LIMITED Corporate Website

삼주에스엠·도리코의 정적 기업 웹사이트입니다. 이 저장소가 개발 소스와 운영 배포의 단일 기준 저장소입니다.

- 운영 사이트: <https://www.samjoosm-doriko.com>
- 배포 방식: GitHub Pages, `main` 브랜치의 저장소 루트
- 애플리케이션 서버·데이터베이스: 없음
- 콘텐츠 데이터: `data/*.json`

## 중요 배포 원칙

`CNAME`에는 운영 도메인이 연결되어 있습니다. 파일을 삭제하거나 값을 변경하면 운영 사이트가 중단될 수 있습니다.

사이트는 저장소 루트에서 바로 배포됩니다. 별도의 `frontend/`, `dist/`, `build/` 배포 디렉터리를 만들거나 다른 저장소의 산출물로 루트 파일을 덮어쓰지 마세요.

## 로컬 실행

Node.js 18 이상이 필요합니다.

```bash
npm ci
npm run dev
```

브라우저에서 <http://127.0.0.1:4000>을 엽니다. `index.html`을 `file://`로 직접 열면 브라우저 CORS 정책 때문에 JSON 데이터를 읽지 못할 수 있습니다.

## 검증

```bash
# JSON, 선대 데이터, 내장 폴백 데이터, 운영 도메인 점검
npm run build

# 360/390/768px 화면과 모바일 메뉴 점검
npm run audit:mobile

# 전체 점검
npm run audit
```

`npm run build`는 배포 파일을 생성하거나 수정하지 않습니다. GitHub Pages의 루트 배포 구조를 보호하기 위해 콘텐츠 검증만 수행합니다.

## 구조

```text
.
├── CNAME                 # 운영 도메인 — 삭제/변경 금지
├── index.html            # 운영 페이지
├── policy.html           # 회사 방침 전문 (MM-00 F-5/F-6/F-8)
├── css/style.css
├── js/
│   ├── main.js
│   ├── i18n.js
│   ├── api.js
│   ├── icons.js
│   └── data.js           # file:// 환경용 내장 데이터 폴백
├── data/                 # 콘텐츠 기준 데이터(JSON)
├── images/
├── downloads/
├── scripts/
│   ├── dev-server.mjs
│   ├── content-audit.mjs
│   └── mobile-audit.mjs
└── package.json
```

## 콘텐츠 수정

1. `data/*.json`을 수정합니다.
2. 선대 정보 변경 시 `js/data.js`의 내장 폴백도 함께 갱신합니다.
3. `npm run audit`를 통과시킵니다.
4. 변경 내용을 검토한 뒤 `main`에 병합합니다.

`scripts/content-audit.mjs`는 모든 JSON의 문법, 선박·선주 데이터, `data/fleet.json`과 `js/data.js`의 선대 정보 일치 여부, `CNAME` 및 canonical 도메인을 확인합니다.

## 회사 방침 (policy.html)

`policy.html`은 통합경영시스템 주 매뉴얼 `MM-00`의 방침 3건 전문을 게시합니다.

| 문서 | 방침 |
| --- | --- |
| `MM-00 F-5` | 회사의 안전, 보건, 품질 및 환경보호 방침 (SHQE Policy of Company) |
| `MM-00 F-6` | 마약 및 알코올 통제 방침 (Drug & Alcohol Control Policy) |
| `MM-00 F-8` | 윤리경영 방침 (Corporate Policy of Ethical Management) |

ISO 14001:2015 5.2는 환경방침을 이해관계자가 취득할 수 있도록 요구하며(9001 5.2.2·45001 5.2는 `as appropriate` 조건부), 이 페이지가 그 공개 경로입니다. 따라서 다음을 지켜주세요.

- 본문은 사내 승인 원본과 **글자 단위로 동일**해야 합니다. 홍보 문구로 다듬지 마세요.
- 방침 개정 시 `Rev.`, 시행일자, 본문을 원본과 함께 갱신합니다.
- `https://www.samjoosm-doriko.com/policy.html`은 심사·선주 vetting에 제출되는 고정 URL입니다. 경로를 바꾸지 마세요.

원본 위치는 Teams `01. 통합경영시스템 IMS Master/{01. DORIKO LIMITED, 02. SAMJOO SM CO.,LTD}/01. 주 매뉴얼 Main Manual/` 입니다.

## 배포

`main`에 반영된 루트 파일이 GitHub Pages에서 배포됩니다. 배포 후 다음을 확인하세요.

- <https://www.samjoosm-doriko.com> HTTPS 접속
- 한국어/영어 전환
- 모바일 메뉴와 주요 섹션 링크
- 이미지·JSON·입사지원서 다운로드
- 브라우저 콘솔 오류 유무

© 2026 SAMJOO SM CO., LTD. All rights reserved.
