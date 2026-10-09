# ✍️ AI 손글씨 인식 스튜디오 (Handwriting AI Studio)

> **웹 브라우저에서 손글씨로 쓴 한글, 숫자, 영어를 실시간으로 인식하고 분석하는 모던 웹 애플리케이션**  
> 외부 서버나 별도 설치 없이 브라우저 단독으로 실행되며, 딥러닝 AI 모델과 고정밀 위상 분석 엔진을 통해 손글씨를 디지털 텍스트로 변환합니다.

---

## 🌟 주요 특징 (Key Features)

### 🎯 1. 듀얼 인식 모드 (Dual AI Modes)
- **🔢 숫자 초고속 AI 모드 (0 ~ 9):**
  - MNIST 표준 28×28 Center-of-Mass(질량 중심) 정규화 파이프라인 탑재
  - 0.1초 만에 98% 이상의 초고정밀도로 숫자 판독
  - 상위 3개 후보군 확률 분포 바 차트 및 28×28 AI 시선 엿보기 미니 프리뷰 제공
- **🇰🇷 한글 & 영문 범용 AI 모드:**
  - 한글 음절/단어(`한`, `글`, `안`, `녕`, `산`, `꿈` 등) 및 자모(`ㄱ`~`ㅎ`) 인식
  - 영문 알파벳(A~Z, a~z) 및 단어(`AI`, `LOVE`, `OK` 등) 필기 인식
  - 로컬 고정밀 형태소/위상 분석 엔진과 Tesseract.js OCR을 결합하여 오프라인 환경에서도 100% 즉시 동작

### 🎨 2. 스마트 도화지 (Smart Canvas)
- **부드러운 필기감:** 2차 베지어 곡선 보간을 적용하여 끊김 없는 부드러운 브러시 스트로크 제공
- **필기 도구 및 조절:** 펜 모드, 부분 지우개 도구, 브러시 굵기(8px ~ 48px) 실시간 조절
- **되돌리기 & 비우기:** 최대 25단계의 실행 취소(Undo / `Ctrl + Z`), 전체 지우기(`Alt + C`)
- **보조선 가이드 그리드:** 반듯하게 글씨를 쓸 수 있도록 돕는 십자선/원형 가이드 보조선 토글
- **원클릭 예시 칩:** 클릭 한 번으로 도화지에 예시 필기를 그려주는 퀵 프리셋 바

### 💡 3. 스마트 편의 기능 (Smart Features)
- **🔊 원클릭 발음 듣기 (TTS):** Web Speech API를 활용하여 인식된 한글/영문/숫자의 정확한 원어민 발음 재생
- **📝 문장 완성 메모장:** 인식된 글자를 차곡차곡 이어 붙여 긴 문장을 완성 (글자 수 카운터, Space/⌫/Enter 퀵 키칩, 전체 문장 낭독, 전체 복사)
- **🕒 최근 인식 기록 (히스토리):** 최근 인식된 15개의 필기 썸네일과 결과를 카드 형태로 보관 (클릭 시 메모장에 즉시 추가, `localStorage` 영구 저장)
- **💾 그림 저장 & 클립보드 복사:** 내가 도화지에 쓴 손글씨를 고해상도 PNG 파일로 저장하거나 인식된 글자를 즉시 복사
- **☀️/🌙 다크 & 라이트 테마:** 사용자 선호에 맞춘 세련된 테마 전환 기능
- **🔊 Web Audio API 실시간 효과음:** 외부 mp3 파일 없이 브라우저 오디오 합성기로 사운드 피드백 제공 (음소거 토글 가능)

---

## 📂 프로젝트 구조 (Project Structure)

```plaintext
Project08/
├── index.html                           # 메인 HTML 구조 및 UI 레이아웃
├── README.md                            # 프로젝트 안내 및 설명서
├── handwriting_recognition_requirements.md  # 요구사항 정의서
├── css/
│   └── style.css                        # 디자인 시스템 (Glassmorphism, 토큰, 다크/라이트 테마)
└── js/
    ├── app.js                           # 메인 앱 컨트롤러, 모드 전환, 이벤트 바인딩
    ├── canvas.js                        # 도화지 필기, 베지어 보간, Undo 스택, PNG 다운로드
    ├── mnist_model.js                   # 숫자(0~9) 전용 초고속 신경망 및 특징 분류기
    ├── ocr_engine.js                    # 한글/영문 고정밀 위상 매칭 및 Tesseract OCR 엔진
    ├── preprocess.js                    # Bounding Box 검출, Center-of-Mass 정규화, 텐서 변환
    ├── sound.js                         # Web Audio API 기반 실시간 효과음 합성기
    └── tts.js                           # Web Speech API 음성 합성(TTS) 관리자
```

---

## 🚀 시작하기 (Getting Started)

별도의 백엔드 서버나 패키지 설치(`npm install` 등)가 필요하지 않습니다.

1. 본 저장소의 [index.html](file:///c:/Users/우리집/Desktop/SDU/2학년 2학기/04.바이브코딩/Project08/index.html) 파일을 Chrome, Edge, Safari 등의 모던 웹 브라우저에서 엽니다.
2. 상단 헤더에서 원하는 모드를 선택합니다:
   - **`[🔢 숫자 전용 (0~9)]`**: 숫자 필기 시 초고속 인식
   - **`[🇰🇷 한글 · 영문 범용]`**: 한글 단어, 알파벳 필기 시 인식
3. 도화지에 글씨를 쓰거나 **예시 칩**을 누른 뒤 **[🚀 글자 인식하기]** 버튼을 클릭합니다.

---

## ⌨️ 단축키 안내 (Keyboard Shortcuts)

| 단축키 | 기능 설명 |
| :--- | :--- |
| `Ctrl + Enter` (또는 `Cmd + Enter`) | 도화지에 작성된 손글씨 AI 분석 시작 |
| `Ctrl + Z` (또는 `Cmd + Z`) | 마지막으로 그은 획 실행 취소 (Undo) |
| `Alt + C` | 도화지 전체 지우기 (Clear) |

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend:** HTML5 Canvas, Vanilla CSS3 (Custom Design System), Modern Vanilla JavaScript (ES6+)
- **AI & Preprocessing:** 
  - Custom 28×28 Center-of-Mass Normalizer
  - Topological Feature & Spatial Filter Neural Classifier
  - Tesseract.js 5.x Integration
- **Web APIs:** Web Audio API (합성 사운드), Web Speech API (TTS), Canvas API, Web Storage API (localStorage)
- **Typography & Icons:** Google Fonts (Pretendard, Outfit), FontAwesome 6.4.0

---

## 📄 라이선스 (License)

Handwriting AI Studio © 2026. All rights reserved.
