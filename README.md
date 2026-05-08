# 3D HSSG 기반 세이프티 플랫폼
### Data To Safety

> 시설물 관리와 소방 대응의 패러다임 전환.  
> **3D HSSG**(Hierarchical Semantic Scene Graph) 기술을 통해 건축물 데이터를 정밀하게 구조화하고  
> 실시간 재난 대응 시각화를 제공합니다.

<br>

![home Section](./public/home.jpeg)

---

## 목차

1. [플랫폼 사용 단계](#01-플랫폼-사용-단계)
2. [핵심 이점](#02-핵심-이점)
3. [프론트엔드 구조 및 기술 사양](#03-프론트엔드-구조-및-기술-사양)

---

<br>

## 01. 플랫폼 사용 단계

플랫폼은 데이터의 유입부터 전술적 활용까지 **5가지 수직적 레벨(Floor)** 로 운영됩니다.


<br>

| Level | Name | 설명 |
|:---:|:---|:---|
| `01F` | **Data Acquisition** | 시설 관리자가 현장의 2D Scan 데이터를 업로드합니다. |
| `02F` | **3D-HSSG Generation** | AI 알고리즘이 데이터를 정밀한 Digital Twin으로 변환합니다. |
| `03F` | **Facility Management** | 3D 뷰어를 통해 건물 내부 설비를 입체적으로 관리합니다. |
| `04F` | **Strategic Sharing** | 관제 데이터를 소방·재난 대응팀과 실시간 동기화합니다. |
| `EVAC` | **Emergency Protocol** | 재난 발생 시 즉각적인 전술 모드(Tactical Mode)로 전환합니다. |

* 업로드 화면

![upload Section](./public/upload.jpeg)

* 뷰어 화면

![viewer Section](./public/viewer.jpeg)

<br>

<details>
<summary><b>각 레벨 상세 설명 보기</b></summary>

<br>

**Level 01 — Data Acquisition**
- 모든 데이터의 진입점으로, 시스템 구축을 위한 Raw Data를 확보합니다.

**Level 02 — 3D-HSSG Generation**
- 건물의 가상 골조와 객체 간 계층적 세만틱 구조를 완성합니다.

**Level 03 — Facility Management**
- 배관, 전기 시설 등 비가시 영역을 가시화하여 정밀한 시설 모니터링을 수행합니다.

**Level 04 — Strategic Sharing**
- 유기적인 데이터 네트워크를 통해 통합 재난 대비망을 구축합니다.

**Level 05 — Emergency Protocol**
- 구조 대원을 위한 최단 생존 경로 및 위험 구역 데이터를 실시간으로 출력합니다.

</details>

<br>

---

## 02. 핵심 이점

<br>

**BIM-Free 정밀 구조화**
> 무거운 BIM 데이터 없이도 2D 스캔 데이터만으로 객체 지향적 3D HSSG를 생성합니다.  
> 도입 비용을 획기적으로 절감하면서도 정밀도를 유지합니다.

**실시간 전술 가시성**
> 연기나 암흑으로 가려진 실제 현장에서도 투명한 공간 정보를 시각화합니다.  
> 대응팀의 시야와 안전을 확보합니다.

**구조적 무결성 (Structural Integrity)**
> 데이터 추출부터 관리까지 일관된 계층 구조를 유지합니다.  
> 재난 시 정보의 신뢰도를 보장합니다.



<br>

---

## 03. 프론트엔드 구조 및 기술 사양

### 기술 스택

| 분류 | 기술 |
|:---|:---|
| Framework | Next.js 14+ (App Router), React |
| Styling | Tailwind CSS, Shadcn/UI |
| Animation | Framer Motion, Tailwind Keyframes |
| Icons | Lucide React |
| HTTP | Axios |

<br>

### 핵심 구현 상세

#### 1. Liquid Glass 시각화 — SVG Refraction

배경의 유동적인 액체 질감과 유리 카드의 굴절 효과를 위해 SVG 필터를 동적으로 적용합니다.

```xml
<filter id="liquid-refraction">
  <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="25" />
</filter>
```

<br>

#### 2. 전술 상태 관리 — Tactical State

`isEmergency` 상태 변수를 통해 플랫폼 전체 테마를 즉각 전환합니다.

| Mode | 배경 | 포인트 컬러 |
|:---|:---|:---|
| Normal | `#fffafa` | 레드 / 챠콜 (안정적 시설 관리) |
| Emergency | `#ffebeb` | 발광 레드 + 애니메이션 가속 |

<br>

#### 3. API 및 업로드 파이프라인

**3-1. 인증 (Authentication)**

```
POST /auth/login    { email, password }
POST /auth/signup   { email, password, name }
```

**3-2. 파일 업로드 — 2단계 방식**

대용량 파일 전송 최적화를 위해 Presigned URL 방식을 사용합니다.

```
# Step 1 — URL 발급
POST /data_transform/upload
Authorization: Bearer {token}
Body: { filename, content_type, building_id }
→ 반환: upload_url

# Step 2 — 직접 전송
PUT {upload_url}
Body: <file binary>
```

**3-3. 공통 설정**

| 항목 | 값 |
|:---|:---|
| Base URL | `NEXT_PUBLIC_API_URL` (환경 변수) |
| 인증 방식 | Bearer Token (모든 보안 경로 자동 포함) |
| HTTP 클라이언트 | Axios |

<br>

#### 4. 프로젝트 디렉토리 구조

```
/
├── hero-section      # Liquid Glass 배경 및 플랫폼 정체성 랜딩 영역
├── features-section  # 5단계 워크플로우 수직 로드맵
├── navigation        # 스크롤·상태 연동 지능형 네비게이션
├── upload            # 데이터 유입 인터페이스
└── viewer            # 3D 관제 인터페이스
```

<br>

---

<div align="center">

© 2026 SafeHSSG Project. All Rights Reserved.

</div>
